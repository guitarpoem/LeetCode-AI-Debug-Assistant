const DEEPSEEK_API_KEY = 'sk-291566e416f24f6e8d81ef1bf3ff5a9a'; // 您的DeepSeek API密钥

console.log('Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in background:', request);
    if (request.action === "debugCode") {
        console.log("debugCode in background.js");
        debugCode(request.content)
            .then(result => sendResponse({result}))
            .catch(error => sendResponse({error: error.message}));
        return true; // 保持消息通道开放
    }
});

async function debugCode(content) {
    const prompt = `
请帮我检查以下LeetCode代码中的问题：

题目描述：
${content.description}

用户代码：
${content.code}

指令：
1.请指出代码中可能存在的bug和改进建议
2.先用一句话概括最突出的问题

附加要求：
1. 使用Markdown格式输出
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
                temperature: 0.7,
                stream: true // 启用流式响应
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || '请求失败');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const {value, done} = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, {stream: true});
            
            // 解析SSE数据
            const lines = buffer.split('\n'); // 将buffer按换行符分割
            buffer = lines.pop() || ''; 
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const json = JSON.parse(data);
                        const content = json.choices[0]?.delta?.content || '';
                        if (content) {
                            console.log('准备发送内容:', content);  // 检查发送的内容
                            chrome.runtime.sendMessage({
                                type: 'streamContent',
                                content
                            }, () => {
                                // 添加回调检查发送是否成功
                                if (chrome.runtime.lastError) {
                                    console.error('发送失败:', chrome.runtime.lastError);
                                } else {
                                    console.log('发送成功');
                                }
                            });
                        }
                    } catch (e) {
                        console.error('解析响应数据失败:', e);
                    }
                }
            }
        }
        
        // 发送完成信号
        chrome.runtime.sendMessage({
            type: 'streamComplete'
        });
        
        return '';
    } catch (error) {
        throw new Error('调用AI服务失败: ' + error.message);
    }
} 