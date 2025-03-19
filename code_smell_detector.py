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