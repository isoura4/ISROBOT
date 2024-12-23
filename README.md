 # Discord Bot

Ce bot Discord est conçu pour intégrer diverses fonctionnalités, y compris l'intégration avec Twitch, des commandes personnalisées, et des notifications de nouveaux streams.

Si vous voulez essayer le bot sans l'héberger vous-même, vous pouvez l'inviter à votre serveur en utilisant le lien suivant :

[Inviter le Bot](https://discord.com/oauth2/authorize?client_id=1318211219542511617)

![image](https://github.com/user-attachments/assets/3a091324-5c63-4c3e-8c8e-02bc431eceb1)

## Fonctionnalités

- **Intégration Twitch** : Vérifie les streams Twitch et envoie des annonces dans un salon spécifié.
- **Commandes Personnalisées** : Ajoutez des commandes personnalisées comme `/apt` pour afficher des GIFs spéciaux.
- **Notifications de Nouveaux Streams** : Notifie les utilisateurs lorsque de nouveaux streams commencent.
- **Rechargement Périodique des Commandes** : Recharge les commandes périodiquement pour s'assurer qu'elles sont enregistrées correctement.
- **Commandes de Modération** : Gère les rôles, les salons, et les permissions.

## Prérequis

- Node.js (v21.7.3 ou supérieur)
- npm (Node Package Manager)

## Installation

1. **Cloner le dépôt** :
   ```bash
   git clone https://github.com/isoura4/bot-discord.git
   cd bot-discord

2. **Installer les dépendances** :
   ```bash
   npm install discord.js node-fetch express @discordjs/rest dotenv
   ```
# Configuration

   1. Configurer le fichier config.json :
   Remplacez les valeurs dans le fichier config.json avec vos propres informations.
   2. Exemple de config.json :

   ```bash
      {
          "token": "your_discord_bot_token",
          "clientId": "your_discord_client_id",
          "blueskyHandle": "your_bluesky_handle",
          "blueskyAppPassword": "your_bluesky_app_password",
          "twitchClientId": "your_twitch_client_id",
          "twitchClientSecret": "your_twitch_client_secret"
      }
   ```

# Démarrer le bot :

    npm start

# Licence

Ce projet est sous licence GNU. Voir le fichier LICENSE pour plus de détails.
#Contributions

Les contributions sont les bienvenues ! Veuillez ouvrir une issue ou une pull request pour toute suggestion ou amélioration.
# Contact

Pour toute question ou suggestion, veuillez ouvrir une issue sur ce dépôt.

Note : Assurez-vous de modifier le fichier config.json avec les valeurs nécessaires pour faire fonctionner le bot sur votre propre serveur.

### Conclusion

En suivant ces étapes, vous devriez être en mesure de mettre à jour le fichier `README.md` pour refléter les fonctionnalités actuelles de votre bot Discord, les prérequis, les instructions d'installation, la configuration, la licence, les contributions et les informations de contact. Si vous avez des questions supplémentaires ou besoin d'aide pour implémenter d'autres fonctionnalités, n'hésitez pas à demander !
