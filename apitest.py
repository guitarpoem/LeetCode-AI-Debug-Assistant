# Please install OpenAI SDK first: `pip3 install openai`

from openai import OpenAI

API_KEY = "sk-291566e416f24f6e8d81ef1bf3ff5a9a"
client = OpenAI(api_key=API_KEY, base_url="https://api.deepseek.com")

response = client.chat.completions.create(
    model="deepseek-chat",
    messages=[
        {"role": "system", "content": "You are a helpful assistant"},
        {"role": "user", "content": "解释为什么：生鱼片是死鱼片"},
    ],
    stream=False
)

print(response.choices[0].message.content)