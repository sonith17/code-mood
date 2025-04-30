const Parser = require("tree-sitter");
const Python = require("tree-sitter-python");
// const Java = require("tree-sitter-java");
// const CPP = require("tree-sitter-cpp");
const JavaScript = require("tree-sitter-javascript");
const fs = require("fs");

// Choose language
const languageMap = {
  'python': Python,
//   'java': Java,
//   'cpp': CPP,
  'javascript': JavaScript,
  'js': JavaScript
};

function detectSmells(tree, lang, code) {
  const smells = [];

  const cursor = tree.rootNode.walk();
  const repeatedExprMap = new Map();
  const commentLines = new Set();
  const classMethodCount = new Map();
  
  // For dead code detection
  const functionsDefined = new Map(); // Maps function names to line numbers
  const functionsCalled = new Set();

  const duplicateCodeMap = new Map();
  const codeLines = code.split("\n");
  const normalizedLines = codeLines.map(line => line.trim()).filter(line => line && !line.startsWith("#") && !line.startsWith("//"));

  // === Sliding window duplicate code detection ===
  for (let i = 0; i < normalizedLines.length - 4; i++) {
    const chunk = normalizedLines.slice(i, i + 5).join("\n");
    const hash = require("crypto").createHash("md5").update(chunk).digest("hex");
    
    if (duplicateCodeMap.has(hash)) {
      const firstOccurrence = duplicateCodeMap.get(hash);
      smells.push(`Duplicate Code: Similar code block at line ${i + 1} (also at line ${firstOccurrence})`);
    } else {
      duplicateCodeMap.set(hash, i + 1);
    }
  }

  const controlStructures = {
    python: ["if_statement", "for_statement", "while_statement", "else_clause", "elif_clause"],
    java: ["if_statement", "for_statement", "while_statement", "else_statement"],
    cpp: ["if_statement", "for_statement", "while_statement", "else_clause"],
    javascript: ["if_statement", "for_statement", "while_statement", "else_clause"]
  };

  const magicNumberTypes = {
    python: ["integer", "float"],
    java: ["decimal_integer_literal", "floating_point_literal"],
    cpp: ["number_literal"],
    javascript: ["number"]
  };

  // Modify the walk function to track the current function name
function walk(node, depth = 0, ifNestingDepth = 0, currentClass = null, currentFunction = null) {
    // Track function definition for each language
    let functionName = currentFunction; // Keep existing function name if we're already in a function
    
    // Python function definition
    if (lang === "python" && node.type === "function_definition") {
      const body = node.namedChildren.find(c => c.type === "block");
      const name = node.child(1)?.text;
      if (name) {
        functionsDefined.set(name, node.startPosition.row + 1);
        functionName = name; // Set current function name
      }
      
      if (body && body.namedChildren.length > 10) {
        smells.push(`Long Method: ${name} at line ${node.startPosition.row + 1}`);
      }
      
      // Too many parameters
      const parameters = node.namedChildren.find(c => c.type === "parameters")?.namedChildren || [];
      if (parameters.length > 3) {
        smells.push(`Too Many Parameters: ${name} has ${parameters.length} parameters at line ${node.startPosition.row + 1}`);
      }
    }
  
    // Java method definition
    if (lang === "java" && node.type === "method_declaration") {
      const body = node.namedChildren.find(c => c.type === "block");
      const name = node.childForFieldName("name");
      if (name) {
        functionsDefined.set(name.text, node.startPosition.row + 1);
        functionName = name.text; // Set current function name
      }
      
      if (body && body.namedChildren.length > 10) {
        smells.push(`Long Method: ${name.text} at line ${node.startPosition.row + 1}`);
      }
      
      // Too many parameters
      const parameters = node.namedChildren.find(c => c.type === "formal_parameters")?.namedChildren || [];
      const paramList = parameters.filter(p => p.type === "formal_parameter");
      if (paramList.length > 3) {
        smells.push(`Too Many Parameters: ${name.text} has ${paramList.length} parameters at line ${node.startPosition.row + 1}`);
      }
      
      if (currentClass) {
        classMethodCount.set(currentClass, (classMethodCount.get(currentClass) || 0) + 1);
      }
    }
  
    // C++ function definition
    if (lang === "cpp" && node.type === "function_definition") {
      const body = node.namedChildren.find(c => c.type === "compound_statement");
      const decl = node.namedChildren.find(c => c.type === "function_declarator");
      const name = decl?.namedChildren.find(c => c.type === "identifier")?.text || "unknown";
      
      if (name !== "unknown") {
        functionsDefined.set(name, node.startPosition.row + 1);
        functionName = name; // Set current function name
      }
      
      if (body && body.namedChildren.length > 10) {
        smells.push(`Long Method: ${name} at line ${node.startPosition.row + 1}`);
      }
      
      // Too many parameters
      const parameters = decl?.namedChildren.find(c => c.type === "parameter_list")?.namedChildren || [];
      const paramList = parameters.filter(p => p.type === "parameter_declaration");
      if (paramList.length > 3) {
        smells.push(`Too Many Parameters: ${name} has ${paramList.length} parameters at line ${node.startPosition.row + 1}`);
      }
    }
    
    // JavaScript function definition
    if (lang === "javascript" && (node.type === "function_declaration" || node.type === "method_definition" || node.type === "function")) {
      let name;
      let body;
      
      if (node.type === "method_definition") {
        name = node.childForFieldName("name")?.text || "anonymous";
        body = node.namedChildren.find(c => c.type === "statement_block");
      } else {
        name = node.namedChildren.find(c => c.type === "identifier")?.text || "anonymous";
        body = node.namedChildren.find(c => c.type === "statement_block");
      }
      
      if (name !== "anonymous") {
        functionsDefined.set(name, node.startPosition.row + 1);
        functionName = name; // Set current function name
      }
      
      if (body && body.namedChildren.length > 10) {
        smells.push(`Long Method: ${name} at line ${node.startPosition.row + 1}`);
      }
      
      // Too many parameters
      const parameters = node.namedChildren.find(c => c.type === "formal_parameters")?.namedChildren || [];
      const paramList = parameters.filter(p => ["identifier", "formal_parameter"].includes(p.type));
      if (paramList.length > 3) {
        smells.push(`Too Many Parameters: ${name} has ${paramList.length} parameters at line ${node.startPosition.row + 1}`);
      }
    }
  
    // Track function calls for dead code detection
    if (lang === "python" && node.type === "call") {
      const funcName = node.childForFieldName("function")?.text;
      if (funcName) {
        functionsCalled.add(funcName);
      }
    }
    
    if ((lang === "java" || lang === "javascript") && node.type === "call_expression") {
      const funcName = node.childForFieldName("function")?.text;
      if (funcName) {
        functionsCalled.add(funcName);
      }
    }
    
    if (lang === "cpp" && node.type === "call_expression") {
        // In C++, function calls can be direct or qualified (namespace::function)
        const funcNode = node.childForFieldName("function");
        if (funcNode) {
          // Handle direct function calls
          if (funcNode.type === "identifier") {
            const funcName = funcNode.text;
            functionsCalled.add(funcName);
          } 
          // Handle qualified function calls (with namespace or class scope)
          else if (funcNode.type === "qualified_identifier" || 
                   funcNode.type === "field_expression" ||
                   funcNode.type === "scoped_identifier") {
            // Get the rightmost identifier (actual function name)
            const fullName = funcNode.text;
            // Add both the full qualified name and the simple name
            functionsCalled.add(fullName);
            
            // Extract simple function name after :: or .
            const simpleName = fullName.split(/::|\./g).pop();
            if (simpleName) {
              functionsCalled.add(simpleName);
            }
          }
        }
      }
      
  
    // Magic Numbers
    if (magicNumberTypes[lang]?.includes(node.type)) {
      const val = node.text;
      if (!["0", "1"].includes(val)) {
        smells.push(`Magic Number: ${val} at line ${node.startPosition.row + 1}`);
      }
    }
  
    // Deep Nesting (control structures)
    const isControl = controlStructures[lang]?.includes(node.type);
    if (depth > 3 && isControl) {
      if (functionName) {
        smells.push(`Deeply Nested Code: ${functionName}() at line ${node.startPosition.row + 1}`);
      } else {
        smells.push(`Deep Nesting: ${node.type.replace('_', ' ')} at line ${node.startPosition.row + 1}`);
      }
    }
    
    // Deep Nesting specifically for if-else
    const isIfStatement = node.type === "if_statement" || 
                          (lang === "python" && (node.type === "elif_clause" || node.type === "else_clause")) ||
                          (lang === "java" && node.type === "else_statement") ||
                          (lang === "cpp" && node.type === "else_clause") ||
                          (lang === "javascript" && node.type === "else_clause");
                        
    if (isIfStatement) {
      const newIfNestingDepth = ifNestingDepth + 1;
      if (newIfNestingDepth > 3) {
        // Include function name if available
        if (functionName) {
          smells.push(`Deeply Nested If-Else: ${functionName}() at line ${node.startPosition.row + 1}`);
        } else {
          smells.push(`Deeply Nested If-Else: nesting level ${newIfNestingDepth} at line ${node.startPosition.row + 1}`);
        }
      }
      
      // Update ifNestingDepth for children
      ifNestingDepth = newIfNestingDepth;
    }
  
    // Comment Lines
    if (node.type === "comment" || 
        (lang === "java" && (node.type === "line_comment" || node.type === "block_comment"))) {
      for (let i = node.startPosition.row; i <= node.endPosition.row; i++) {
        commentLines.add(i);
      }
    }
  
    // Class tracking
    if ((lang === "java" || lang === "cpp") && node.type === "class_declaration") {
      const name = node.childForFieldName("name")?.text;
      if (name) currentClass = name;
    }
    
    if (lang === "python" && node.type === "class_definition") {
      const name = node.child(1)?.text;
      if (name) currentClass = name;
    }
    
    if (lang === "javascript" && (node.type === "class_declaration" || node.type === "class")) {
      const name = node.namedChildren.find(c => c.type === "identifier")?.text;
      if (name) currentClass = name;
    }
  
    // Collect duplicate expressions
    if (node.type === "binary_expression" || 
        (lang === "python" && (node.type === "binary_operator" || node.type === "comparison_operator"))) {
      const expr = node.text;
      if (repeatedExprMap.has(expr)) {
        smells.push(`Duplicate Expression: "${expr}" at line ${node.startPosition.row + 1} (also at line ${repeatedExprMap.get(expr)})`);
      } else {
        repeatedExprMap.set(expr, node.startPosition.row + 1);
      }
    }
  
    // Visit children - pass the current function name to track nesting within functions
    for (let child of node.namedChildren) {
      walk(child, isControl ? depth + 1 : depth, ifNestingDepth, currentClass, functionName);
    }
  }
  walk(tree.rootNode, 0, 0, null, null);

  // Large Class
  for (const [cls, count] of classMethodCount.entries()) {
    if (count >= 7) {
      // Find the line number of the class definition
      let classLine = 1;
      cursor.reset();
      let foundClass = false;
      
      do {
        const node = cursor.currentNode;
        if ((node.type === "class_declaration" || node.type === "class_definition" || node.type === "class") && 
            (node.childForFieldName("name")?.text === cls || node.child(1)?.text === cls)) {
          classLine = node.startPosition.row + 1;
          foundClass = true;
          break;
        }
      } while (cursor.gotoNextSibling() || (cursor.gotoParent() && cursor.gotoNextSibling()));
      
      if (foundClass) {
        smells.push(`Large Class: ${cls} has ${count} methods at line ${classLine}`);
      } else {
        // Fallback if class line not found
        smells.push(`Large Class: ${cls} has ${count} methods`);
      }
    }
  }

  // High Comment Density (Excessive Comments)
  const totalLines = codeLines.length;
  const commentRatio = commentLines.size / totalLines;
  if (commentRatio > 0.3 && commentLines.size > 5) {
    smells.push(`Excessive Comments: ${Math.round(commentRatio * 100)}% of the code is comments at line 1`);
  }
  
  // Dead Code (Unused Functions)
  for (const [funcName, lineNum] of functionsDefined.entries()) {
    // Skip main/constructor functions which might be called externally
    const isSpecialFunction = funcName === "main" || 
                           funcName === "__init__" || 
                           funcName.startsWith("_") || 
                           funcName.includes("test") ||
                           funcName === "operator=" ||
                           funcName.startsWith("~") ||  // Destructors
                           funcName.match(/^operator[+\-*\/=<>!]/) ||  // Operator overloads
                           (lang === "cpp" && funcName.includes("::"));  // Fully qualified names
    if (!isSpecialFunction && !functionsCalled.has(funcName)) {
        smells.push(`Dead Code: Unused function "${funcName}" at line ${lineNum}`);
    }
  }
  return smells;
}

// === MAIN ===
async function analyzeFile(filePath, langKey) {
  const code = fs.readFileSync(filePath, "utf-8");
  const parser = new Parser();
  const lang = languageMap[langKey.toLowerCase()];
  if (!lang) {
    console.error("Unsupported language:", langKey);
    return;
  }

  parser.setLanguage(lang);
  const tree = parser.parse(code);
  const smells = detectSmells(tree, langKey.toLowerCase(), code);
  if (smells.length === 0) {
    console.log("No code smells detected.");
  } else {
    console.log("Detected Code Smells:");
    smells.forEach(s => console.log("- " + s));
  }
  return smells;
}

// Usage: node code_smell_detector.js <filePath> <language>
if (process.argv.length < 4) {
  console.error("Usage: node code_smell_detector.js <filePath> <language>");
  process.exit(1);
}
analyzeFile(process.argv[2], process.argv[3]);

exports.analyzeFile = analyzeFile;