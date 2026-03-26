const OWNER_ID = 792897455; // ה-chat_id שלך

function ownerOnly(bot) {
  bot.use(async (ctx, next) => {
    if (ctx.from?.id !== OWNER_ID) {
      await ctx.reply('⛔ אין לך הרשאה');
      return;
    }
    await next();
  });
}

module.exports = { ownerOnly };
