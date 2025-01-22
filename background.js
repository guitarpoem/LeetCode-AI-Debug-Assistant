const DEEPSEEK_API_KEY = 'sk-291566e416f24f6e8d81ef1bf3ff5a9a'; // 您的DeepSeek API密钥

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "debugCode") {
        debugCode(request.content)
            .then(result => sendResponse({result}))
            .catch(error => sendResponse({error: error.message}));
        return true; // 保持消息通道开放
    }
});

async function debugCode(content) {
    const prompt = `
请帮我检查以下LeetCode代码中的潜在问题：

题目描述：
${content.description}

用户代码：
${content.code}

请指出代码中可能存在的bug和改进建议。
`;

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
            },
            body: JSON.stringify({
                messages: [
                    { 
                        role: "system", 
                        content: "You are a helpful programming assistant specialized in debugging code."
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                model: "deepseek-chat",
                temperature: 0.7
            })
        });

        const data = await response.json();
        if (!response.ok) {
            throw new Error(data.error?.message || '请求失败');
        }
        return data.choices[0].message.content;
    } catch (error) {
        throw new Error('调用AI服务失败: ' + error.message);
    }
} 