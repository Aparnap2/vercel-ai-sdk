export async function GET() {
  console.log('[TEST-STREAM] Received test stream request');
  
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      // Send test messages
      const messages = [
        'This is a test stream message 1',
        'This is a test stream message 2',
        'This is a test stream message 3'
      ];
      
      for (const [index, message] of messages.entries()) {
        console.log(`[TEST-STREAM] Sending message ${index + 1}: ${message}`);
        controller.enqueue(encoder.encode(`0:"${message}"\n`));
        // Add a small delay between messages
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      console.log('[TEST-STREAM] Stream complete');
      controller.close();
    },
  });
  
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
