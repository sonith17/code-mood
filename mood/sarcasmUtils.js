const { getClient } = require("../clientConfig.js");

async function getSarcasticComment(issue) {
    const client = getClient();
    if (!client) return "";

    try {
        const response = await client.chatCompletion({
            model: "mistralai/Mistral-7B-Instruct-v0.3",
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
        model: "mistralai/Mistral-7B-Instruct-v0.3",
        messages: [
            {
              role: "system",
              content: `You are a mood-detecting AI that evaluates programming code and returns one mood that describes the programmer's mental state.
          
          Return only one of the following mood words based on the code:
          normal, frustrated, relaxed, lazy, focused, overwhelmed, experimental, confident, anxious, perfectionist, procrastinating.
          
          Do not explain your answer. Return just one word, exactly as listed above.`
            },
            {
              role: "user",
              content: code
            }
          ],             
        max_tokens: 5
    });

    return response.choices[0].message.content.trim().toLowerCase();
}

module.exports = { getSarcasticComment, getDeveloperState };
