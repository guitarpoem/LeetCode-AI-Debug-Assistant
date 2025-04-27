const DEEPSEEK_API_KEY = ''; // 您的DeepSeek API密钥

console.log('Background script loaded');

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('Message received in background:', request);
    console.log('model used:', request.model);
    if (request.action === "debugCode") {
        console.log("debugCode in background.js");
        debugCode(request.content, request.model)
            .then(result => sendResponse({result}))
            .catch(error => sendResponse({error: error.message}));
        return true; // 保持消息通道开放
    }
});

async function debugCode(content, model) {
    // Get the API key from storage
    const { deepseekApiKey } = await chrome.storage.local.get('deepseekApiKey');
    if (!deepseekApiKey) {
        throw new Error('DeepSeek API key not found. Please set your API key in the extension popup.');
    }

    const messages = [{
        role: "user",
        content: `请帮我检查以下LeetCode代码中的问题：

题目描述：
${content.description}

用户代码：
${content.code}

当前测试用例输入：
${content.testResult.input}

测试结果：
状态: ${content.testResult.status}
运行时间: ${content.testResult.runtime}

指令：
1.请指出代码中可能存在的bug和改进建议
2.先用一句话概括问题和解决方法

附加要求：
1. 使用Markdown格式输出`
    }];

    try {
        const response = await fetch('https://api.deepseek.com/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${deepseekApiKey}`
            },
            body: JSON.stringify({
                messages: messages,
                model: model,
                temperature: 0.7,
                stream: true
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error?.message || '请求失败');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';
        let reasoningContent = '';
        let content = '';

        while (true) {
            const {value, done} = await reader.read();
            if (done) break;
            
            buffer += decoder.decode(value, {stream: true});
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';
            
            for (const line of lines) {
                if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    
                    try {
                        const json = JSON.parse(data);
                        const delta = json.choices[0]?.delta;
                        
                        // Handle both reasoning_content and regular content
                        if (delta.reasoning_content) {
                            reasoningContent += delta.reasoning_content;
                            // Optionally send reasoning content to popup
                            chrome.runtime.sendMessage({
                                type: 'streamContent',
                                content: delta.reasoning_content,
                                isReasoning: true // 标记为推理内容
                                
                            });
                        }
                        if (delta.content) {
                            content += delta.content;
                            chrome.runtime.sendMessage({
                                type: 'streamContent',
                                content: delta.content
                            });
                        }
                    } catch (e) {
                        console.error('解析响应数据失败:', e);
                    }
                }
            }
        }
        
        // Send complete signal
        chrome.runtime.sendMessage({
            type: 'streamComplete'
        });
        
        return '';
    } catch (error) {
        throw new Error('调用AI服务失败: ' + error.message);
    }
} 