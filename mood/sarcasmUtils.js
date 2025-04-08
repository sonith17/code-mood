const { getClient } = require("../clientConfig.js");

async function getSarcasticComment(issue) {
    const client = getClient();
    if (!client) return "";

    try {
        const response = await client.chatCompletion({
            model: "mistralai/Mistral-7B-Instruct-v0.1",
            messages: [{
                role: "user",
                content: `A senior developer is reviewing this issue: '${issue}'. Respond sarcastically in one line.`
            }],
            max_tokens: 30
        });
        return response.choices[0].message.content.split(".")[0] + ".";
    }
    catch (error) {
        console.error("Error fetching sarcastic comment:", error);
        return "";
    }

    
}

async function getDeveloperState(code) {
    const client = getClient();
    if (!client) return "normal";

    const response = await client.chatCompletion({
        model: "mistralai/Mistral-7B-Instruct-v0.1",
        messages: [
            { role: "system", content: "Return one word: frustrated, relaxed, lazy, etc." },
            { role: "user", content: code }
        ],
        max_tokens: 5
    });

    return response.choices[0].message.content.trim().toLowerCase();
}

module.exports = { getSarcasticComment, getDeveloperState };
