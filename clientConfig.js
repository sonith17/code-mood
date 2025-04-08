let client = null;

async function initializeClient() {
    try {
        const { InferenceClient } = await import("@huggingface/inference");
        client = new InferenceClient("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");
    } catch (err) {
        console.error("Failed to initialize client:", err);
    }
}

initializeClient();

function getClient() {
    return client;
}

module.exports = { getClient };
