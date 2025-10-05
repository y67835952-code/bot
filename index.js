const { Client, GatewayIntentBits, Partials, EmbedBuilder } = require('discord.js');
const fs = require('fs');
const TOKEN = ''; // <---- 替换为你的Bot Token
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildMembers,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});
let giveaways = {};
const WINNERS_FILE = './winners.json';

// 时间解析
function parseDuration(str) {
  let m = str.match(/^(\d+)(s|m|h)$/);
  if (!m) return null;
  let n = parseInt(m[1]);
  if (m[2] === 's') return n * 1000;
  if (m[2] === 'm') return n * 60 * 1000;
  if (m[2] === 'h') return n * 60 * 60 * 1000;
  return null;
}

function saveWinner(data) {
  let list = [];
  if (fs.existsSync(WINNERS_FILE)) list = JSON.parse(fs.readFileSync(WINNERS_FILE));
  list.unshift(data);
  if (list.length > 5) list = list.slice(0, 5);
  fs.writeFileSync(WINNERS_FILE, JSON.stringify(list, null, 2));
}

async function dmWinners(users, prize, host, channel) {
  for (const user of users) {
    try {
      await user.send(`🎉 恭喜你在 #${channel.name} 的抽奖活动中获得奖品！\n奖品：${prize}\n发起人：${host}\n如有疑问请联系发起人～`);
    } catch (e) {}
  }
}

function pickWinners(arr, num) {
  arr = arr.slice();
  arr.sort(() => Math.random() - 0.5);
  return arr.slice(0, num);
}

async function endGiveaway(msgId, interaction = null) {
  const gw = giveaways[msgId];
  if (!gw || gw.ended) return;
  gw.ended = true;
  const participants = Array.from(gw.participants);
  gw.lastParticipants = gw.participants;
  if (participants.length < gw.winners) {
    await gw.channel.send(`🎊 抽奖结束！\n奖品：**${gw.prize}**\n没有足够的参与者。`);
    return;
  }
  const winners = pickWinners(participants, gw.winners);
  gw.winnersList = winners;
  await gw.channel.send(`🎊 抽奖结束！\n奖品：**${gw.prize}**\n获奖者：${winners.map(u => `<@${u.id}>`).join(', ')}\n👤 发起人：<@${gw.host.id}>`);
  dmWinners(winners, gw.prize, gw.host, gw.channel);
  saveWinner({
    prize: gw.prize,
    winners: winners.map(u => u.id),
    host: gw.host.id,
    time: new Date().toISOString(),
    channel: gw.channel.name
  });
}

client.on('ready', () => {
  console.log(`Bot上线: ${client.user.tag}`);
});

client.on('interactionCreate', async interaction => {
  if (!interaction.isChatInputCommand()) return;
  // /giveaway
  if (interaction.commandName === 'giveaway') {
    const duration = parseDuration(interaction.options.getString('duration'));
    const winners = interaction.options.getInteger('winners');
    const prize = interaction.options.getString('prize');
    const showhost = interaction.options.getBoolean('showhost');
    const channel = interaction.options.getChannel('channel') || interaction.channel;

    if (!duration || winners < 1) return interaction.reply({ content: '参数错误！', ephemeral: true });
    await interaction.reply({ content: `✅ 抽奖已在 ${channel} 发起！`, ephemeral: true });

    const embed = new EmbedBuilder()
      .setTitle('🎉 抽奖开始啦！')
      .addFields(
        { name: '奖品', value: `**${prize}**` },
        { name: '中奖人数', value: `**${winners}**` },
        { name: '剩余时间', value: `${Math.floor(duration / 1000)} 秒` },
        { name: '点 🌟 参加', value: '⭐ 点🌟表情参加！' },
      )
      .setColor(0xF1C40F);
    if (showhost !== false) embed.addFields({ name: '发起人', value: `<@${interaction.user.id}>` });

    let msg = await channel.send({ embeds: [embed] });
    await msg.react('🌟');
    giveaways[msg.id] = {
      host: interaction.user,
      prize,
      winners,
      channel,
      endTime: Date.now() + duration,
      msg,
      participants: new Set(),
      ended: false,
    };
    setTimeout(() => endGiveaway(msg.id), duration);
  }

  // /end
  if (interaction.commandName === 'end') {
    let gw = Object.values(giveaways).find(g => !g.ended && g.channel.id === interaction.channel.id);
    if (!gw) return interaction.reply({ content: '无活动可结束', ephemeral: true });
    endGiveaway(gw.msg.id, interaction);
  }

  // /reroll
  if (interaction.commandName === 'reroll') {
    let gw = Object.values(giveaways).find(g => g.ended && g.channel.id === interaction.channel.id);
    if (!gw || !gw.lastParticipants) return interaction.reply({ content: '无可重抽的活动', ephemeral: true });
    let winners = pickWinners(Array.from(gw.lastParticipants), gw.winners);
    gw.winnersList = winners;
    gw.channel.send(`🔁 重新抽奖结果：恭喜 ${winners.map(u => `<@${u.id}>`).join(', ')} 获得 **${gw.prize}**！ 🎉`);
    dmWinners(winners, gw.prize, gw.host, gw.channel);
    saveWinner({
      prize: gw.prize,
      winners: winners.map(u => u.id),
      host: gw.host.id,
      time: new Date().toISOString(),
      channel: gw.channel.name
    });
  }

  // /list
  if (interaction.commandName === 'list') {
    let list = [];
    if (fs.existsSync(WINNERS_FILE)) list = JSON.parse(fs.readFileSync(WINNERS_FILE));
    if (!list.length) return interaction.reply('暂无抽奖记录');
    let embed = new EmbedBuilder().setTitle('📋 抽奖历史纪录').setColor(0x3498DB);
    list.forEach(rec => {
      embed.addFields({
        name: `${rec.prize} (${rec.channel})`,
        value: `🎯 中奖人数：${rec.winners.length}\n👤 发起人：<@${rec.host}>\n🏆 获奖者：${rec.winners.map(id => `<@${id}>`).join(', ')}\n🕒 时间：${rec.time}`
      });
    });
    interaction.reply({ embeds: [embed] });
  }
});

// reaction收集
client.on('messageReactionAdd', async (reaction, user) => {
  if (user.bot || reaction.emoji.name !== '🌟') return;
  const gw = giveaways[reaction.message.id];
  if (!gw || gw.ended) return;
  gw.participants.add(user);
});

client.login(TOKEN);