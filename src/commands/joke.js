import axios from 'axios';

export default {
  name: 'joke',
  description: 'Tells a random joke',
  async execute(interaction, t) {
    try {
      const response = await axios.get('https://official-joke-api.appspot.com/random_joke');
      const joke = response.data;
      await interaction.reply(`${joke.setup} - ${joke.punchline}`);
    } catch (error) {
      console.error(error);
      await interaction.reply(t('joke.error'));
    }
  },
};