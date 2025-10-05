const { REST, Routes } = require('discord.js');
const TOKEN = '你的Bot令牌';   // <---- 替换为你的Bot Token
const CLIENT_ID = '你的应用ID'; // <---- 替换为你的应用ID

const commands = [
  {
    name: 'giveaway',
    description: '举办一个抽奖',
    options: [
      { name: 'duration', type: 3, description: '持续时间(如1m/30s/2h)', required: true },
      { name: 'winners', type: 4, description: '中奖人数', required: true },
      { name: 'prize', type: 3, description: '奖品内容', required: true },
      { name: 'showhost', type: 5, description: '是否显示发起人', required: false },
      { name: 'channel', type: 7, description: '在哪个频道举办（可不填）', required: false },
    ],
  },
  { name: 'end', description: '提前结束抽奖', options: [] },
  { name: 'reroll', description: '重新抽奖', options: [] },
  { name: 'list', description: '查看抽奖历史', options: [] },
];

const rest = new REST({ version: '10' }).setToken(TOKEN);

rest.put(Routes.applicationCommands(CLIENT_ID), { body: commands })
  .then(() => console.log('Slash commands registered'))
  .catch(console.error);