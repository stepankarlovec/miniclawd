export class MockProvider {
    constructor() {
        this.responses = [
            JSON.stringify({ tool: 'list_dir', args: { path: '.' } }),
            JSON.stringify({ answer: 'I have listed the files.' })
        ];
        this.callCount = 0;
    }

    async chat(messages) {
        const response = this.responses[this.callCount] || JSON.stringify({ answer: 'No more mock responses.' });
        this.callCount++;
        return response;
    }
}
