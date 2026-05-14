const amqp = require('amqplib');

let channel;

const initRabbitMQ = async () => {
    try {
        // Retry connection logic for RabbitMQ since it might start slower than Node.js
        const connectWithRetry = async (retryCount = 5) => {
            try {
                return await amqp.connect(process.env.RABBITMQ_URL || 'amqp://127.0.0.1:5672');
            } catch (err) {
                if (retryCount === 0) throw err;
                console.log(`⏳ RabbitMQ bağlantısı deneniyor... Kalan deneme: ${retryCount}`);
                await new Promise(res => setTimeout(res, 5000));
                return connectWithRetry(retryCount - 1);
            }
        };

        const connection = await connectWithRetry();
        channel = await connection.createChannel();
        
        // Ensure queue exists
        await channel.assertQueue('notifications', { durable: true });
        console.log('🟢 RabbitMQ Connected Successfully. Queue: "notifications"');
    } catch (error) {
        console.error('🔴 RabbitMQ Connection Error:', error);
    }
};

const publishNotification = async (message) => {
    if (!channel) {
        console.error('🔴 RabbitMQ channel is not initialized yet');
        return;
    }
    try {
        channel.sendToQueue('notifications', Buffer.from(JSON.stringify(message)), { persistent: true });
        console.log(`🐰 [RabbitMQ] Mesaj Kuyruğa Fırlatıldı:`, message.type);
    } catch (error) {
        console.error('🔴 RabbitMQ Publish Error:', error);
    }
};

const getChannel = () => channel;

module.exports = { initRabbitMQ, publishNotification, getChannel };
