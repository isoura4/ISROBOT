# Bot Discord Multifonctionnel

Ce bot Discord est conçu pour offrir plusieurs fonctionnalités utiles pour les serveurs Discord. Voici un aperçu des principales fonctionnalités :

  - Gestion des Événements Planifiés : Créez, annoncez et gérez des événements planifiés dans votre serveur Discord.
   - Intégration avec Bluesky et Twitch : Vérifiez les nouveaux posts de Bluesky et les streams Twitch, et annoncez-les dans votre serveur.
   - Jeu de Compteur : Un mini-jeu où les utilisateurs doivent répondre avec le chiffre suivant dans une séquence.
   - Génération Automatique de serverConfig.json et config.json : Le bot génère automatiquement les fichiers de configuration nécessaires.
   - Commandes de Divertissement : Commande joke pour raconter des blagues aléatoires.

# Prérequis

    Node.js (version 21.x ou supérieure)
    npm (version 6.x ou supérieure)

# Installation

   Clonez ce dépôt :

    git clone https://github.com/isoura4/ISROBOT.git
    cd votre-depot

# Installez les dépendances :

    npm install

Le fichier config.json sera généré automatiquement lors du premier lancement du bot. Vous devrez modifier certaines valeurs dans ce fichier pour qu'elles correspondent à vos besoins :

    {
        "token": "votre_discord_bot_token",
        "clientId": "votre_discord_client_id",
        "blueskyHandle": "votre_bluesky_handle",
        "blueskyAppPassword": "votre_bluesky_app_password",
        "twitchClientId": "votre_twitch_client_id",
        "twitchClientSecret": "votre_twitch_client_secret"
    }

# Fonctionnalités
1. Gestion des Événements Planifiés

    Création d'Événements : Utilisez la commande /createevent pour créer un nouvel événement planifié.
    Annonce d'Événements : Utilisez la commande /announceevent pour annoncer un événement dans un salon textuel spécifique.

2. Intégration avec Bluesky et Twitch

    Vérification des Posts Bluesky : Le bot vérifie les nouveaux posts de Bluesky toutes les 5 minutes et les annonce dans votre serveur.
    Vérification des Streams Twitch : Le bot vérifie les nouveaux streams Twitch toutes les 5 minutes et les annonce dans votre serveur.

3. Jeu de Compteur

    Démarrage du Jeu : Utilisez la commande /startcounter pour démarrer le jeu de compteur dans un salon spécifique.
    Règles du Jeu : Les utilisateurs doivent répondre avec le chiffre suivant dans une séquence. Si quelqu'un ne répond pas avec le bon chiffre, le compteur reprend à zéro. Si une même personne répond deux fois de suite, le compteur reprend également à zéro avec un message différent.

4. Génération Automatique de serverConfig.json et config.json

    Le bot génère automatiquement les fichiers serverConfig.json et config.json s'ils n'existent pas. Ces fichiers ne sont pas poussés sur GitHub et sont ignorés par .gitignore.

5. Commandes de Divertissement

    Commande joke : Utilisez la commande /joke pour raconter une blague aléatoire.

# Utilisation 

Démarrer le Bot :

    node index.js

Utiliser les Commandes (Exemples) :

   Créer un Événement :

    /createevent name:"Nom de l'événement" description:"Description de l'événement" date:"YYYY-MM-DD" start_time:"HH:MM" end_time:"HH:MM" channel:"#nom-du-salon" image:"URL de l'image" frequency:"ONE_TIME/WEEKLY/DAILY"

   Annoncer un Événement :

    /announceevent event_id:"ID de l'événement" channel:"#nom-du-salon"

   Démarrer le Jeu de Compteur :

    /startcounter channel:"#nom-du-salon"

  Raconter une Blague :

    /joke

# Contribution

Les contributions sont les bienvenues ! Si vous avez des suggestions ou des améliorations, n'hésitez pas à ouvrir une issue ou à soumettre une pull request.
# License

Ce projet est sous licence GNU General Public License (GPL) version 3. Voir le fichier LICENSE pour plus de détails.
# Inviter le Bot dans Votre Serveur

Si vous ne souhaitez pas héberger le bot vous-même, vous pouvez l'inviter dans votre serveur Discord en utilisant le lien suivant :

[Inviter le Bot](https://discord.com/oauth2/authorize?client_id=1318211219542511617)

![image](https://github.com/user-attachments/assets/3a091324-5c63-4c3e-8c8e-02bc431eceb1)
