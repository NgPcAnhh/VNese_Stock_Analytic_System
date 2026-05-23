from openai import OpenAI

client = OpenAI(
  api_key="")

response = client.responses.create(
  model="gpt-5.4-mini",
  input="hello",
  store=True,
)

print(response.output_text);
