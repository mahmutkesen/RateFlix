const { getChannel } = require('../utils/rabbitClient');
const Notification = require('../models/Notification');

const startWorker = async () => {
    // Wait for a few seconds to make sure the RabbitMQ channel is fully established
    setTimeout(async () => {
        const channel = getChannel();
        if (!channel) {
            console.error('🔴 Notification Worker: RabbitMQ kanalı bulunamadı.');
            return;
        }

        console.log('🟢 Notification Worker kuyruğu dinlemeye başladı...');
        
        channel.consume('notifications', async (msg) => {
            if (msg !== null) {
                try {
                    const data = JSON.parse(msg.content.toString());
                    console.log('👷 [WORKER] RabbitMQ Kuyruğundan mesaj alındı:', data.type);

                    // Save notification to MongoDB
                    await Notification.create({
                        user: data.userId,
                        message: data.message,
                        type: data.type || 'SYSTEM'
                    });

                    console.log('👷 [WORKER] Bildirim başarıyla veritabanına yazıldı!');
                    
                    // Acknowledge the message (remove from queue)
                    channel.ack(msg);
                } catch (err) {
                    console.error('🔴 [WORKER] Mesaj işlenirken hata oluştu:', err);
                }
            }
        });
    }, 5000);
};

module.exports = { startWorker };
