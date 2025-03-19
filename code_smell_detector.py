import ast
import sys

class CodeSmellDetector(ast.NodeVisitor):
    def __init__(self):
        self.issues = []
        self.function_calls = set()
        self.functions_defined = set()
        self.comment_lines = 0
        self.total_lines = 0
    def visit_FunctionDef(self, node):
        self.functions_defined.add(node.name)

        if len(node.body) > 10: 
            self.issues.append(f"Long Method: {node.name}() at line {node.lineno}")

        if len(node.args.args) > 3:  
            self.issues.append(f"Too Many Parameters: {node.name}() at line {node.lineno}")

        if self.get_nesting_depth(node) > 3:
            self.issues.append(f"Deeply Nested Code in {node.name}() at line {node.lineno}")

        self.generic_visit(node)

    def visit_Call(self, node):
        if isinstance(node.func, ast.Name):
            self.function_calls.add(node.func.id)
        self.generic_visit(node)

    def visit_Constant(self, node):
        if isinstance(node.value, (int, float)) and node.value not in (0, 1):
            self.issues.append(f"Magic Number: {node.value} at line {getattr(node, 'lineno', 'unknown')}")

    def visit_ClassDef(self, node):
        method_count = sum(isinstance(n, ast.FunctionDef) for n in node.body)
        if method_count > 5:
            self.issues.append(f"Large Class: {node.name} at line {node.lineno}")
        self.generic_visit(node)

    def visit_Expr(self, node):
        if isinstance(node.value, ast.BinOp):
            expression = self.get_expression_string(node.value)
            if expression in self.issues:
                self.issues.append(f"Duplicate Code: Repeated expression '{expression}' at line {node.lineno}")
        self.generic_visit(node)

    def visit_If(self, node):
        if self.get_nesting_depth(node) > 3:
            self.issues.append(f"Deeply Nested If-Else at line {node.lineno}")
        self.generic_visit(node)

    def visit_Module(self, node):
        self.total_lines = len(node.body)
        for item in node.body:
            if isinstance(item, ast.Expr) and isinstance(item.value, ast.Constant) and isinstance(item.value.value, str):
                self.comment_lines += 1
        self.generic_visit(node)

    def detect_excessive_comments(self):
        if self.total_lines > 0 and (self.comment_lines / self.total_lines) > 0.3:
            self.issues.append(f"Excessive Comments: {self.comment_lines}/{self.total_lines} lines are comments")

    def detect_dead_code(self):
        unused_functions = self.functions_defined - self.function_calls
        for func in unused_functions:
            self.issues.append(f"Dead Code: Function '{func}()' is defined but never used")
    
    @staticmethod
    def get_nesting_depth(node, depth=0):
        if not hasattr(node, "body") or not isinstance(node.body, list):
            return depth
        return max(CodeSmellDetector.get_nesting_depth(child, depth + 1) for child in node.body if isinstance(child, ast.AST))

    @staticmethod
    def get_expression_string(node):
        if isinstance(node, ast.BinOp):
            return f"{node.left} {type(node.op).__name__} {node.right}"
        return str(node)

def detect_code_smells(code):
    try:
        tree = ast.parse(code)
        detector = CodeSmellDetector()
        detector.visit(tree)
        detector.detect_excessive_comments()
        detector.detect_dead_code()
        return "\n".join(detector.issues) if detector.issues else "No code smells detected."
    except Exception as e:
        return f"Error analyzing code: {str(e)}"

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Error: No file provided.")
        sys.exit(1)
    try:
        file_path = sys.argv[1]
        with open(file_path, "r", encoding="utf-8") as f:
            code_content = f.read()

        print(detect_code_smells(code_content))
    except FileNotFoundError:
        print(f"Error: File '{file_path}' not found.")
    except Exception as e:
        print(f"Unexpected error: {e}")
