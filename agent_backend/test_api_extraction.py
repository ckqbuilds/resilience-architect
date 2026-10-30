"""Self-check for tool-result extraction in api.py. Run: uv run test_api_extraction.py"""

from api import parse_tool_result_text, extract_resources_from_messages, extract_experiments_from_messages

use_aws_text = ("Success: {'Functions': [{'FunctionName': 'fn-a', 'FunctionArn': 'arn:aws:lambda:us-east-1:1:function:fn-a', "
                "'LastModified': datetime.datetime(2025, 12, 5, 1, 2, 3, tzinfo=tzutc())}]}")
assert parse_tool_result_text('{"a": 1}') == {"a": 1}
assert parse_tool_result_text(use_aws_text)['Functions'][0]['LastModified'] is None
assert parse_tool_result_text("AWS call threw exception: boom") is None

# toolUse is in the assistant message, its toolResult in the following user message
messages = [
    {"role": "user", "content": [{"text": "list lambdas"}]},
    {"role": "assistant", "content": [{"toolUse": {"toolUseId": "t1", "name": "use_aws",
                                                   "input": {"service_name": "lambda", "region": "us-east-1"}}}]},
    {"role": "user", "content": [{"toolResult": {"toolUseId": "t1", "content": [{"text": use_aws_text}]}}]},
    {"role": "assistant", "content": [{"toolUse": {"toolUseId": "t2", "name": "list_experiment_plans", "input": {}}}]},
    {"role": "user", "content": [{"toolResult": {"toolUseId": "t2", "content": [{"text": '[{"name": "Plan A", "risk_level": "LOW"}]'}]}}]},
    {"role": "assistant", "content": [{"text": "Done."}]},
]
resources = extract_resources_from_messages(messages)
assert [(r['service'], r['name'], r['id']) for r in resources] == [
    ('lambda', 'fn-a', 'arn:aws:lambda:us-east-1:1:function:fn-a')], resources
experiments = extract_experiments_from_messages(messages)
assert [(e['name'], e['riskLevel']) for e in experiments] == [('Plan A', 'LOW')], experiments

print("ok")
