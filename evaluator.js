/*
 * Evaluator
 *
 * This module is actually focused on getting a numerical result from
 * the expression, but embeds the functionality of the preceding ones 
 * (lexer, syntax_checker and parse). Thus, its main method takes an
 * expression (string) and generates an evaluation tree. This tree is
 * similar to the parse tree, but each of its nodes have a `fn` method
 * that operates that specific node.
 * The `evaluate` function returns a function that takes the values of
 * unknowns present in the expression, and returns a numerical result.
 *
 * On the other hand, fastEvaluate does a similar job, but skips the
 * generation of the evaluation tree and calculates the result directly.
 * This solution may be faster when there is only one calculation to be
 * done, whereas the normal evaluator should be faster when calculating
 * multiple times the same expression.
 */

const { lexer } = require('./lexer.js');
const { syntax_check } = require('./syntax_check.js');
const { parse } = require('./parse.js');

function evaluate(expression) {
    function traverse(node) {
        if (node.type === 'block') {
            traverse(node.child[0]);
            node.fn = variables => node.child[0].fn(variables);
        } else if (node.type === 'unary_operator') {
            traverse(node.child);
            
            if (node.operator === '+')
                node.fn = vars => node.child.fn(vars);
            else if (node.operator === '-')
                node.fn = vars => -node.child.fn(vars);
        } else if (node.type === 'binary_operator'){
            traverse(node.left);
            traverse(node.right);
            
            if (node.operator === '+')
                node.fn = vars => node.left.fn(vars) + node.right.fn(vars);
            else if (node.operator === '-')
                node.fn = vars => node.left.fn(vars) - node.right.fn(vars);
            else if (node.operator === '*')
                node.fn = vars => node.left.fn(vars) * node.right.fn(vars);
            else if (node.operator === '/')
                node.fn = vars => node.left.fn(vars) / node.right.fn(vars);
            else if (node.operator === '^')
                node.fn = vars => node.left.fn(vars) ** node.right.fn(vars);
        } else if (node.type === 'literal') {
            node.fn = vars => parseFloat(node.value, 10);
        } else if (node.type === 'variable')
            node.fn = vars => vars[node.name];
    }

    let [tokens, unknowns] = lexer(expression);
    tokens = syntax_check(tokens);
    let parse_tree = parse(tokens);

    let evaluate_tree = {};
    Object.assign(evaluate_tree, parse_tree);

    traverse(evaluate_tree, unknowns);

    return {
        calc: variables => {
            if (Object.keys(variables).length !== unknowns.length)
                throw Error(`Incorrect number of values passed: should be ${unknowns.length} and is ${Object.keys(variables).length}`);
            for (let v of unknowns)
                if (!variables.hasOwnProperty(v))
                    throw Error(`Missing value for variable ${v}`);
        
            return evaluate_tree.fn(variables);
        },
        unknowns
    };
}

function fastEvaluate(expression, values) {
    function traverse(node, values) {
        if (node.type === 'block') return traverse(node.child[0], values);
        else if (node.type === 'unary_operator') {
            if (node.operator === '+') return traverse(node.child, values);
            else if (node.operator === '-') return -traverse(node.child, values);
        } else if (node.type === 'binary_operator') {
            if (node.operator === '+')
                return traverse(node.left, values) + traverse(node.right, values);
            else if (node.operator === '-')
                return traverse(node.left, values) - traverse(node.right, values);
            else if (node.operator === '*')
                return traverse(node.left, values) * traverse(node.right, values);
            else if (node.operator === '/')
                return traverse(node.left, values) / traverse(node.right, values);
        } else if (node.type === 'literal') 
            return parseInt(node.value, 10);
        else if (node.type === 'variable') return values[node.name];
    }

    let [tokens, unknowns] = lexer(expression);
    tokens = syntax_check(tokens);
    let parse_tree = parse(tokens);

    // Checking for correct values passed
    if (Object.keys(values).length !== unknowns.length)
        throw Error(`Incorrect number of values passed: should be ${unknowns.length} and is ${Object.keys(values).length}`);
    for (let v of unknowns)
        if (!values.hasOwnProperty(v))
            throw Error(`Missing value for variable ${v}`);

    return traverse(parse_tree, values);
}

module.exports = { evaluate, fastEvaluate };
