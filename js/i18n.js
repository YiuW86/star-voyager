// Languages. Texts are written in English in the code; this file translates them on screen.
// Every text shown on the page is checked against the list below (also texts that appear later),
// so new screens are translated automatically as long as their English text is in this list.
(function () {
  const LANGS = ['en', 'nl', 'de', 'fr', 'es', 'pt'];
  const NAMES = { en: 'English', nl: 'Nederlands', de: 'Deutsch', fr: 'Français', es: 'Español', pt: 'Português' };

  // English: [Dutch, German, French, Spanish, Portuguese]
  const T = {
    // Menus
    'Start': ['Start', 'Start', 'Jouer', 'Empezar', 'Começar'],
    'Options': ['Opties', 'Optionen', 'Options', 'Opciones', 'Opções'],
    'Quit': ['Stoppen', 'Beenden', 'Quitter', 'Salir', 'Sair'],
    'Loading artwork…': ['Plaatjes laden…', 'Bilder werden geladen…', 'Chargement des images…', 'Cargando imágenes…', 'A carregar imagens…'],
    'Play with motion': ['Speel met je telefoon', 'Mit dem Handy spielen', 'Jouer avec ton téléphone', 'Juega con tu móvil', 'Joga com o telemóvel'],
    'Scan with your phone, then choose how to play. A second player can scan the same code.': [
      'Scan met je telefoon en kies hoe je speelt. Een tweede speler kan dezelfde code scannen.',
      'Scanne mit deinem Handy und wähle, wie du spielst. Ein zweiter Spieler kann denselben Code scannen.',
      'Scanne avec ton téléphone, puis choisis comment jouer. Un deuxième joueur peut scanner le même code.',
      'Escanea con tu móvil y elige cómo jugar. Un segundo jugador puede escanear el mismo código.',
      'Lê o código com o telemóvel e escolhe como jogar. Um segundo jogador pode ler o mesmo código.'],
    'Choose a world': ['Kies een wereld', 'Wähle eine Welt', 'Choisis un monde', 'Elige un mundo', 'Escolhe um mundo'],
    'Back': ['Terug', 'Zurück', 'Retour', 'Atrás', 'Voltar'],
    'Home': ['Thuis', 'Zuhause', 'Maison', 'Base', 'Base'],
    'Shop': ['Winkel', 'Laden', 'Boutique', 'Tienda', 'Loja'],
    'Alien guide': ['Aliengids', 'Alien-Lexikon', 'Guide des aliens', 'Guía de aliens', 'Guia de aliens'],
    'Connect phone': ['Telefoon koppelen', 'Handy verbinden', 'Connecter le téléphone', 'Conectar móvil', 'Ligar telemóvel'],
    'Phone not connected': ['Telefoon niet gekoppeld', 'Handy nicht verbunden', 'Téléphone non connecté', 'Móvil no conectado', 'Telemóvel não ligado'],
    'Phone connected': ['Telefoon gekoppeld', 'Handy verbunden', 'Téléphone connecté', 'Móvil conectado', 'Telemóvel ligado'],
    'Phone disconnected': ['Telefoon losgekoppeld', 'Handy getrennt', 'Téléphone déconnecté', 'Móvil desconectado', 'Telemóvel desligado'],
    'Waiting for phone…': ['Wachten op telefoon…', 'Warte auf Handy…', 'En attente du téléphone…', 'Esperando el móvil…', 'À espera do telemóvel…'],
    'Setting up connection…': ['Verbinding maken…', 'Verbindung wird aufgebaut…', 'Connexion en cours…', 'Conectando…', 'A ligar…'],
    'All worlds': ['Alle werelden', 'Alle Welten', 'Tous les mondes', 'Todos los mundos', 'Todos os mundos'],
    'Crystal shop': ['Kristalwinkel', 'Kristall-Laden', 'Boutique à cristaux', 'Tienda de cristales', 'Loja de cristais'],
    'Star shop': ['Sterrenwinkel', 'Sternen-Laden', 'Boutique à étoiles', 'Tienda de estrellas', 'Loja de estrelas'],
    'crystals': ['kristallen', 'Kristalle', 'cristaux', 'cristales', 'cristais'],
    'stars to spend': ['sterren te besteden', 'Sterne zum Ausgeben', 'étoiles à dépenser', 'estrellas para gastar', 'estrelas para gastar'],
    'Owned': ['In bezit', 'Gekauft', 'Acheté', 'Comprado', 'Comprado'],
    'Back to the guide': ['Terug naar de gids', 'Zurück zum Lexikon', 'Retour au guide', 'Volver a la guía', 'Voltar ao guia'],
    'Select an alien to read about it. With the phone: point at it and hold for 1 second.': [
      'Kies een alien om erover te lezen. Met de telefoon: wijs hem aan en houd 1 seconde vast.',
      'Wähle ein Alien, um mehr zu lesen. Mit dem Handy: darauf zeigen und 1 Sekunde halten.',
      'Choisis un alien pour en savoir plus. Avec le téléphone : vise-le et tiens 1 seconde.',
      'Elige un alien para leer sobre él. Con el móvil: apúntalo y mantén 1 segundo.',
      'Escolhe um alien para saber mais. Com o telemóvel: aponta e mantém 1 segundo.'],
    // Options
    'Language': ['Taal', 'Sprache', 'Langue', 'Idioma', 'Idioma'],
    'Sound': ['Geluid', 'Ton', 'Son', 'Sonido', 'Som'],
    'On': ['Aan', 'An', 'Oui', 'Sí', 'Sim'],
    'Off': ['Uit', 'Aus', 'Non', 'No', 'Não'],
    'Aim assist': ['Richthulp', 'Zielhilfe', 'Aide à la visée', 'Ayuda de puntería', 'Ajuda de mira'],
    'Low': ['Laag', 'Niedrig', 'Faible', 'Baja', 'Baixa'],
    'Normal': ['Normaal', 'Normal', 'Normal', 'Normal', 'Normal'],
    'Strong': ['Sterk', 'Stark', 'Fort', 'Fuerte', 'Forte'],
    'Aiming hand': ['Richthand', 'Zielhand', 'Main de visée', 'Mano para apuntar', 'Mão de mira'],
    'Right': ['Rechts', 'Rechts', 'Droite', 'Derecha', 'Direita'],
    'Left': ['Links', 'Links', 'Gauche', 'Izquierda', 'Esquerda'],
    'Aim sensitivity': ['Richtgevoeligheid', 'Zielempfindlichkeit', 'Sensibilité de visée', 'Sensibilidad', 'Sensibilidade'],
    'High': ['Hoog', 'Hoch', 'Élevée', 'Alta', 'Alta'],
    'Very high': ['Zeer hoog', 'Sehr hoch', 'Très élevée', 'Muy alta', 'Muito alta'],
    'Aim smoothing': ['Richtdemping', 'Zielglättung', 'Lissage de visée', 'Suavizado', 'Suavização'],
    'Fast': ['Snel', 'Schnell', 'Rapide', 'Rápido', 'Rápido'],
    'Extra smooth': ['Extra rustig', 'Extra ruhig', 'Très lisse', 'Muy suave', 'Muito suave'],
    'Graphics': ['Graphics', 'Grafik', 'Graphismes', 'Gráficos', 'Gráficos'],
    'Auto': ['Auto', 'Auto', 'Auto', 'Auto', 'Auto'],
    'Sharp': ['Scherp', 'Scharf', 'Net', 'Nítido', 'Nítido'],
    'Show speed (FPS)': ['Snelheid tonen (FPS)', 'Tempo anzeigen (FPS)', 'Afficher la vitesse (FPS)', 'Mostrar velocidad (FPS)', 'Mostrar velocidade (FPS)'],
    'Reset progress': ['Voortgang wissen', 'Fortschritt löschen', 'Effacer la progression', 'Borrar progreso', 'Apagar progresso'],
    'Press again to confirm': ['Druk nogmaals om te bevestigen', 'Nochmal drücken zum Bestätigen', 'Appuie encore pour confirmer', 'Pulsa otra vez para confirmar', 'Carrega outra vez para confirmar'],
    'Progress reset': ['Voortgang gewist', 'Fortschritt gelöscht', 'Progression effacée', 'Progreso borrado', 'Progresso apagado'],
    // Connect screen
    'Connect your phone': ['Koppel je telefoon', 'Verbinde dein Handy', 'Connecte ton téléphone', 'Conecta tu móvil', 'Liga o teu telemóvel'],
    'Scan the code with your Android phone, or open the link below and enter this code:': [
      'Scan de code met je telefoon, of open de link hieronder en vul deze code in:',
      'Scanne den Code mit deinem Handy oder öffne den Link unten und gib diesen Code ein:',
      'Scanne le code avec ton téléphone, ou ouvre le lien ci-dessous et saisis ce code :',
      'Escanea el código con tu móvil o abre el enlace de abajo e introduce este código:',
      'Lê o código com o telemóvel ou abre o link abaixo e escreve este código:'],
    'Prop the phone up near the screen, facing you, about 2–3 metres away so your upper body is in view.': [
      'Zet de telefoon bij het scherm, naar je toe, op 2–3 meter zodat je bovenlijf in beeld is.',
      'Stell das Handy neben den Bildschirm, zu dir gerichtet, 2–3 Meter entfernt, sodass dein Oberkörper zu sehen ist.',
      "Pose le téléphone près de l'écran, tourné vers toi, à 2–3 mètres, pour qu'il voie le haut de ton corps.",
      'Coloca el móvil junto a la pantalla, mirando hacia ti, a 2–3 metros, para que se vea la parte de arriba de tu cuerpo.',
      'Põe o telemóvel perto do ecrã, virado para ti, a 2–3 metros, para se ver a parte de cima do teu corpo.'],
    'Play with mouse': ['Spelen met muis', 'Mit Maus spielen', 'Jouer à la souris', 'Jugar con ratón', 'Jogar com rato'],
    'Start level': ['Start level', 'Level starten', 'Lancer le niveau', 'Empezar nivel', 'Começar nível'],
    // In game
    'Menu': ['Menu', 'Menü', 'Menu', 'Menú', 'Menu'],
    'Blaster': ['Blaster', 'Blaster', 'Blaster', 'Bláster', 'Blaster'],
    'Net grenade': ['Netgranaat', 'Netzgranate', 'Grenade filet', 'Granada red', 'Granada rede'],
    'Shield': ['Schild', 'Schild', 'Bouclier', 'Escudo', 'Escudo'],
    'Time grenade': ['Tijdgranaat', 'Zeitgranate', 'Grenade temporelle', 'Granada de tiempo', 'Granada do tempo'],
    'Gear': ['Uitrusting', 'Ausrüstung', 'Équipement', 'Equipo', 'Equipamento'],
    'Point at the screen with your': ['Wijs naar het scherm met je', 'Zeig mit deiner', "Vise l'écran avec ta main", 'Apunta a la pantalla con tu mano', 'Aponta para o ecrã com a mão'],
    'right': ['rechter', 'rechten', 'droite', 'derecha', 'direita'],
    'left': ['linker', 'linken', 'gauche', 'izquierda', 'esquerda'],
    'hand': ['hand', 'Hand auf den Bildschirm', '', '', ''],
    'Hold still for a moment so the game learns your centre position.': [
      'Houd even stil zodat het spel je middenpositie leert.',
      'Halte kurz still, damit das Spiel deine Mitte lernt.',
      'Reste immobile un instant pour que le jeu apprenne ta position.',
      'Quédate quieto un momento para que el juego aprenda tu posición.',
      'Fica quieto um momento para o jogo aprender a tua posição.'],
    'Looking for you…': ['Zoeken naar jou…', 'Suche dich…', 'Je te cherche…', 'Buscándote…', 'À tua procura…'],
    'Hold your arm still…': ['Houd je arm stil…', 'Halte deinen Arm still…', 'Garde ton bras immobile…', 'Mantén el brazo quieto…', 'Mantém o braço quieto…'],
    'Hold still…': ['Houd stil…', 'Stillhalten…', 'Ne bouge pas…', 'Quieto…', 'Quieto…'],
    'Almost there…': ['Bijna klaar…', 'Fast geschafft…', 'Presque…', 'Casi…', 'Quase…'],
    'Skip': ['Overslaan', 'Überspringen', 'Passer', 'Saltar', 'Saltar'],
    'Take a breather.': ['Even uitblazen.', 'Kurz verschnaufen.', 'Petite pause.', 'Tómate un respiro.', 'Faz uma pausa.'],
    'Point at a button and hold to choose it.': ['Wijs een knop aan en houd vast om te kiezen.', 'Zeig auf einen Knopf und halte, um ihn zu wählen.', 'Vise un bouton et tiens pour le choisir.', 'Apunta a un botón y mantén para elegirlo.', 'Aponta para um botão e mantém para o escolher.'],
    'Move the circle to a button and press Fire. Menu returns to the game.': [
      'Beweeg de cirkel naar een knop en druk op Fire. Menu gaat terug naar het spel.',
      'Bewege den Kreis auf einen Knopf und drücke Fire. Menü führt zurück zum Spiel.',
      'Déplace le cercle sur un bouton et appuie sur Fire. Menu revient au jeu.',
      'Mueve el círculo a un botón y pulsa Fire. Menú vuelve al juego.',
      'Move o círculo para um botão e carrega em Fire. Menu volta ao jogo.'],
    'Return to game': ['Terug naar het spel', 'Zurück zum Spiel', 'Reprendre la partie', 'Volver al juego', 'Voltar ao jogo'],
    'Restart level': ['Level opnieuw', 'Level neu starten', 'Recommencer', 'Reiniciar nivel', 'Recomeçar nível'],
    'Main menu': ['Hoofdmenu', 'Hauptmenü', 'Menu principal', 'Menú principal', 'Menu principal'],
    'Paused with the time-out sign': ['Gepauzeerd met het time-outteken', 'Pause mit dem Auszeit-Zeichen', 'Pause avec le signe temps mort', 'Pausa con la señal de tiempo muerto', 'Pausa com o sinal de tempo'],
    'Level clear': ['Level gehaald', 'Level geschafft', 'Niveau réussi', 'Nivel superado', 'Nível concluído'],
    'Level clear!': ['Level gehaald!', 'Level geschafft!', 'Niveau réussi !', '¡Nivel superado!', 'Nível concluído!'],
    'Your shields are down': ['Je schild is op', 'Deine Schilde sind leer', 'Tes boucliers sont à plat', 'Tus escudos se agotaron', 'Os teus escudos acabaram'],
    'Next level': ['Volgend level', 'Nächstes Level', 'Niveau suivant', 'Siguiente nivel', 'Próximo nível'],
    'Next world': ['Volgende wereld', 'Nächste Welt', 'Monde suivant', 'Siguiente mundo', 'Próximo mundo'],
    'Play again': ['Nog een keer', 'Nochmal spielen', 'Rejouer', 'Jugar otra vez', 'Jogar outra vez'],
    'Level select': ['Levels', 'Levelauswahl', 'Choix du niveau', 'Elegir nivel', 'Escolher nível'],
    'Time': ['Tijd', 'Zeit', 'Temps', 'Tiempo', 'Tempo'],
    'Accuracy': ['Nauwkeurigheid', 'Treffsicherheit', 'Précision', 'Precisión', 'Precisão'],
    'Health left': ['Gezondheid over', 'Übrige Energie', 'Santé restante', 'Salud restante', 'Saúde restante'],
    'Crystals earned': ['Kristallen verdiend', 'Kristalle verdient', 'Cristaux gagnés', 'Cristales ganados', 'Cristais ganhos'],
    'Caught!': ['Gevangen!', 'Gefangen!', 'Attrapé !', '¡Atrapado!', 'Apanhado!'],
    'Got away': ['Ontsnapt', 'Entkommen', 'Échappé', 'Escapó', 'Fugiu'],
    'Tip: take less damage for more stars': ['Tip: raak minder geraakt voor meer sterren', 'Tipp: nimm weniger Schaden für mehr Sterne', 'Astuce : prends moins de dégâts pour plus d\'étoiles', 'Consejo: recibe menos daño para ganar más estrellas', 'Dica: sofre menos dano para ganhar mais estrelas'],
    'Tip: aim carefully, fewer missed shots give more stars': ['Tip: richt goed, minder missers geven meer sterren', 'Tipp: ziel genau, weniger Fehlschüsse geben mehr Sterne', 'Astuce : vise bien, moins de tirs ratés donnent plus d\'étoiles', 'Consejo: apunta bien, menos fallos dan más estrellas', 'Dica: aponta bem, menos falhas dão mais estrelas'],
    'Thanks for playing': ['Bedankt voor het spelen', 'Danke fürs Spielen', 'Merci d\'avoir joué', 'Gracias por jugar', 'Obrigado por jogares'],
    'You can close this tab now.': ['Je kunt dit tabblad nu sluiten.', 'Du kannst diesen Tab jetzt schließen.', 'Tu peux fermer cet onglet.', 'Ya puedes cerrar esta pestaña.', 'Já podes fechar este separador.'],
    'Back to title': ['Terug naar start', 'Zurück zum Titel', 'Retour au titre', 'Volver al inicio', 'Voltar ao início'],
    // Prompts and messages during play
    'Reloading…': ['Herladen…', 'Nachladen…', 'Rechargement…', 'Recargando…', 'A recarregar…'],
    'Raise your free hand to reload': ['Steek je vrije hand omhoog om te herladen', 'Heb die freie Hand, um nachzuladen', 'Lève ta main libre pour recharger', 'Levanta la mano libre para recargar', 'Levanta a mão livre para recarregar'],
    'Press Reload on your phone': ['Druk op Reload op je telefoon', 'Drück Reload auf deinem Handy', 'Appuie sur Reload sur ton téléphone', 'Pulsa Reload en tu móvil', 'Carrega em Reload no telemóvel'],
    'Right-click or press R to reload': ['Klik rechts of druk op R om te herladen', 'Rechtsklick oder R zum Nachladen', 'Clic droit ou R pour recharger', 'Clic derecho o R para recargar', 'Clique direito ou R para recarregar'],
    'Step into view of the phone camera': ['Ga in beeld van de telefooncamera staan', 'Stell dich ins Bild der Handykamera', 'Place-toi devant la caméra du téléphone', 'Ponte delante de la cámara del móvil', 'Põe-te à frente da câmara do telemóvel'],
    'Waiting for your phone…': ['Wachten op je telefoon…', 'Warte auf dein Handy…', 'En attente de ton téléphone…', 'Esperando tu móvil…', 'À espera do teu telemóvel…'],
    'Hold the circle still to throw': ['Houd de cirkel stil om te gooien', 'Halte den Kreis still zum Werfen', 'Garde le cercle immobile pour lancer', 'Mantén el círculo quieto para lanzar', 'Mantém o círculo quieto para lançar'],
    'Press Fire to throw': ['Druk op Fire om te gooien', 'Drück Fire zum Werfen', 'Appuie sur Fire pour lancer', 'Pulsa Fire para lanzar', 'Carrega em Fire para lançar'],
    'Shield up: it blocks rocks and attacks': ['Schild aan: het houdt stenen en aanvallen tegen', 'Schild an: es blockt Steine und Angriffe', 'Bouclier activé : il bloque les pierres et les attaques', 'Escudo activado: bloquea rocas y ataques', 'Escudo ligado: bloqueia pedras e ataques'],
    'Keep holding the T to pause': ['Houd de T vast om te pauzeren', 'Halte das T, um zu pausieren', 'Garde le T pour mettre en pause', 'Mantén la T para pausar', 'Mantém o T para pausar'],
    'Hold the circle on a monster to fire': ['Houd de cirkel op een monster om te schieten', 'Halte den Kreis auf ein Monster, um zu schießen', 'Garde le cercle sur un monstre pour tirer', 'Mantén el círculo sobre un monstruo para disparar', 'Mantém o círculo num monstro para disparar'],
    'Aim and press Fire': ['Richt en druk op Fire', 'Ziele und drück Fire', 'Vise et appuie sur Fire', 'Apunta y pulsa Fire', 'Aponta e carrega em Fire'],
    'Click a monster to fire': ['Klik op een monster om te schieten', 'Klick auf ein Monster, um zu schießen', 'Clique sur un monstre pour tirer', 'Haz clic en un monstruo para disparar', 'Clica num monstro para disparar'],
    'Medkit used: +30%': ['Medkit gebruikt: +30%', 'Medikit benutzt: +30 %', 'Trousse utilisée : +30 %', 'Botiquín usado: +30 %', 'Kit médico usado: +30%'],
    'Time slowed down!': ['De tijd gaat trager!', 'Die Zeit läuft langsamer!', 'Le temps ralentit !', '¡El tiempo va más lento!', 'O tempo abrandou!'],
    'Time is back to normal': ['De tijd is weer normaal', 'Die Zeit läuft wieder normal', 'Le temps redevient normal', 'El tiempo vuelve a la normalidad', 'O tempo voltou ao normal'],
    'The net missed': ['Het net miste', 'Das Netz hat verfehlt', 'Le filet a raté', 'La red falló', 'A rede falhou'],
    'Shield recharged': ['Schild weer opgeladen', 'Schild aufgeladen', 'Bouclier rechargé', 'Escudo recargado', 'Escudo recarregado'],
    'Shield broken: back to the blaster': ['Schild kapot: terug naar de blaster', 'Schild kaputt: zurück zum Blaster', 'Bouclier cassé : retour au blaster', 'Escudo roto: vuelves al bláster', 'Escudo partido: de volta ao blaster'],
    'Buy time grenades in the shop first': ['Koop eerst tijdgranaten in de winkel', 'Kauf zuerst Zeitgranaten im Laden', 'Achète d\'abord des grenades temporelles', 'Compra primero granadas de tiempo en la tienda', 'Compra primeiro granadas do tempo na loja'],
    'No net grenades left': ['Geen netgranaten meer', 'Keine Netzgranaten mehr', 'Plus de grenades filet', 'No quedan granadas red', 'Sem granadas rede'],
    'No time grenades left': ['Geen tijdgranaten meer', 'Keine Zeitgranaten mehr', 'Plus de grenades temporelles', 'No quedan granadas de tiempo', 'Sem granadas do tempo'],
    'Shield is recharging': ['Schild laadt op', 'Schild lädt auf', 'Le bouclier se recharge', 'El escudo se está recargando', 'O escudo está a recarregar'],
    'Graphics lowered for smoother play': ['Graphics verlaagd voor soepeler spelen', 'Grafik verringert für flüssigeres Spielen', 'Graphismes réduits pour plus de fluidité', 'Gráficos reducidos para jugar más fluido', 'Gráficos reduzidos para jogar melhor'],
    'Second chance! Back to 50%': ['Tweede kans! Terug naar 50%', 'Zweite Chance! Zurück auf 50 %', 'Deuxième chance ! Retour à 50 %', '¡Segunda oportunidad! Vuelves al 50 %', 'Segunda oportunidade! De volta a 50%'],
    'You reached the crystal!': ['Je hebt het kristal bereikt!', 'Du hast den Kristall erreicht!', 'Tu as atteint le cristal !', '¡Has llegado al cristal!', 'Chegaste ao cristal!'],
    'The floating rocks: jump carefully!': ['De zwevende rotsen: spring voorzichtig!', 'Die schwebenden Felsen: spring vorsichtig!', 'Les rochers flottants : saute prudemment !', 'Las rocas flotantes: ¡salta con cuidado!', 'As rochas flutuantes: salta com cuidado!'],
    'Find the great crystal!': ['Vind het grote kristal!', 'Finde den großen Kristall!', 'Trouve le grand cristal !', '¡Encuentra el gran cristal!', 'Encontra o grande cristal!'],
    'Arrows or A/D to move, Shift to run, Space to jump, J or click to blast': [
      'Pijltjes of A/D om te lopen, Shift om te rennen, spatie om te springen, J of klik om te schieten',
      'Pfeile oder A/D zum Laufen, Shift zum Rennen, Leertaste zum Springen, J oder Klick zum Schießen',
      'Flèches ou A/D pour bouger, Maj pour courir, Espace pour sauter, J ou clic pour tirer',
      'Flechas o A/D para moverte, Mayús para correr, Espacio para saltar, J o clic para disparar',
      'Setas ou A/D para andar, Shift para correr, Espaço para saltar, J ou clique para disparar'],
    'D-pad to move (push far to run), JUMP to jump, Blast to shoot': [
      'D-pad om te lopen (ver duwen = rennen), JUMP om te springen, Blast om te schieten',
      'Steuerkreuz zum Laufen (weit drücken = rennen), JUMP zum Springen, Blast zum Schießen',
      'Croix pour bouger (pousse loin pour courir), JUMP pour sauter, Blast pour tirer',
      'Cruceta para moverte (empuja al fondo para correr), JUMP para saltar, Blast para disparar',
      'Direcional para andar (empurra até ao fim para correr), JUMP para saltar, Blast para disparar'],
    'The extra level needs the Gamepad on your phone (or a keyboard)': [
      'Het extra level speel je met de Gamepad op je telefoon (of een toetsenbord)',
      'Für das Extra-Level brauchst du das Gamepad auf dem Handy (oder eine Tastatur)',
      'Le niveau bonus se joue avec la Manette du téléphone (ou un clavier)',
      'El nivel extra necesita el Mando del móvil (o un teclado)',
      'O nível extra precisa do Comando no telemóvel (ou de um teclado)'],
    // Shop items
    'Bigger magazine': ['Groter magazijn', 'Größeres Magazin', 'Chargeur plus grand', 'Cargador más grande', 'Carregador maior'],
    '12 shots before reloading instead of 8.': ['12 schoten voor het herladen in plaats van 8.', '12 Schüsse vor dem Nachladen statt 8.', '12 tirs avant de recharger au lieu de 8.', '12 disparos antes de recargar en vez de 8.', '12 tiros antes de recarregar em vez de 8.'],
    'Quick reload': ['Snel herladen', 'Schnell nachladen', 'Rechargement rapide', 'Recarga rápida', 'Recarga rápida'],
    'Reloading takes half the time.': ['Herladen duurt half zo lang.', 'Nachladen dauert halb so lang.', 'Recharger prend deux fois moins de temps.', 'Recargar tarda la mitad.', 'Recarregar demora metade do tempo.'],
    'Steady aim': ['Vaste hand', 'Ruhige Hand', 'Visée stable', 'Puntería firme', 'Mira firme'],
    'Stronger aim assist when it is switched on.': ['Sterkere richthulp als die aan staat.', 'Stärkere Zielhilfe, wenn sie an ist.', "Aide à la visée plus forte quand elle est activée.", 'Ayuda de puntería más fuerte si está activada.', 'Ajuda de mira mais forte quando está ligada.'],
    'Emergency medkit': ['Noodmedkit', 'Notfall-Medikit', "Trousse d'urgence", 'Botiquín de emergencia', 'Kit de emergência'],
    'Heals 30% once per level when health drops to 30%.': ['Geneest 30% één keer per level als je gezondheid 30% is.', 'Heilt einmal pro Level 30 %, wenn die Energie auf 30 % fällt.', 'Soigne 30 % une fois par niveau quand la santé tombe à 30 %.', 'Cura un 30 % una vez por nivel cuando la salud baja al 30 %.', 'Cura 30% uma vez por nível quando a saúde chega a 30%.'],
    'Grenade pouch': ['Granatentas', 'Granatentasche', 'Sacoche à grenades', 'Bolsa de granadas', 'Bolsa de granadas'],
    'Start each level with 5 net grenades instead of 3.': ['Begin elk level met 5 netgranaten in plaats van 3.', 'Starte jedes Level mit 5 Netzgranaten statt 3.', 'Commence chaque niveau avec 5 grenades filet au lieu de 3.', 'Empieza cada nivel con 5 granadas red en vez de 3.', 'Começa cada nível com 5 granadas rede em vez de 3.'],
    'Time grenades': ['Tijdgranaten', 'Zeitgranaten', 'Grenades temporelles', 'Granadas de tiempo', 'Granadas do tempo'],
    '2 time grenades per level. Everything slows down for 3 seconds.': ['2 tijdgranaten per level. Alles gaat 3 seconden trager.', '2 Zeitgranaten pro Level. Alles wird 3 Sekunden langsamer.', '2 grenades temporelles par niveau. Tout ralentit pendant 3 secondes.', '2 granadas de tiempo por nivel. Todo va más lento durante 3 segundos.', '2 granadas do tempo por nível. Tudo abranda durante 3 segundos.'],
    'Time grenade pouch': ['Tijdgranatentas', 'Zeitgranatentasche', 'Sacoche temporelle', 'Bolsa de granadas de tiempo', 'Bolsa de granadas do tempo'],
    '4 time grenades per level instead of 2.': ['4 tijdgranaten per level in plaats van 2.', '4 Zeitgranaten pro Level statt 2.', '4 grenades temporelles par niveau au lieu de 2.', '4 granadas de tiempo por nivel en vez de 2.', '4 granadas do tempo por nível em vez de 2.'],
    'Golden blaster': ['Gouden blaster', 'Goldener Blaster', 'Blaster doré', 'Bláster dorado', 'Blaster dourado'],
    'Your blaster turns shiny gold.': ['Je blaster wordt glanzend goud.', 'Dein Blaster wird glänzend golden.', 'Ton blaster devient doré et brillant.', 'Tu bláster se vuelve dorado y brillante.', 'O teu blaster fica dourado e brilhante.'],
    'Rainbow lasers': ['Regenbooglasers', 'Regenbogenlaser', 'Lasers arc-en-ciel', 'Láseres arcoíris', 'Lasers arco-íris'],
    'Every shot sparkles in all colours.': ['Elk schot schittert in alle kleuren.', 'Jeder Schuss glitzert in allen Farben.', 'Chaque tir brille de toutes les couleurs.', 'Cada disparo brilla de todos los colores.', 'Cada tiro brilha em todas as cores.'],
    'Crystal magnet': ['Kristalmagneet', 'Kristallmagnet', 'Aimant à cristaux', 'Imán de cristales', 'Íman de cristais'],
    'Every alien you catch gives 2 crystals instead of 1.': ['Elke alien die je vangt geeft 2 kristallen in plaats van 1.', 'Jedes gefangene Alien gibt 2 Kristalle statt 1.', 'Chaque alien attrapé donne 2 cristaux au lieu de 1.', 'Cada alien atrapado da 2 cristales en vez de 1.', 'Cada alien apanhado dá 2 cristais em vez de 1.'],
    'Second chance': ['Tweede kans', 'Zweite Chance', 'Deuxième chance', 'Segunda oportunidad', 'Segunda oportunidade'],
    'Once per level: when your health runs out, come back with 50%.': ['Eén keer per level: als je gezondheid op is, ga je door met 50%.', 'Einmal pro Level: Wenn deine Energie leer ist, machst du mit 50 % weiter.', 'Une fois par niveau : quand ta santé est épuisée, tu reviens avec 50 %.', 'Una vez por nivel: cuando se acaba tu salud, vuelves con un 50 %.', 'Uma vez por nível: quando a saúde acaba, voltas com 50%.'],
    'Helper drone': ['Helperdrone', 'Helferdrohne', "Drone d'aide", 'Dron ayudante', 'Drone ajudante'],
    'A little drone that catches an alien for you every 10 seconds.': ['Een kleine drone die elke 10 seconden een alien voor je vangt.', 'Eine kleine Drohne, die alle 10 Sekunden ein Alien für dich fängt.', 'Un petit drone qui attrape un alien pour toi toutes les 10 secondes.', 'Un pequeño dron que atrapa un alien por ti cada 10 segundos.', 'Um pequeno drone que apanha um alien por ti a cada 10 segundos.'],
    // World names
    'Crystal Shores': ['Kristalkust', 'Kristallküste', 'Rivage de Cristal', 'Costa de Cristal', 'Costa de Cristal'],
    'Glowwood Forest': ['Gloeibos', 'Leuchtwald', 'Forêt Lumineuse', 'Bosque Brillante', 'Floresta Brilhante'],
    'Sunken Lagoon': ['Verzonken Lagune', 'Versunkene Lagune', 'Lagon Englouti', 'Laguna Hundida', 'Lagoa Submersa'],
    'Sunfire Dunes': ['Zonnevuurduinen', 'Sonnenfeuer-Dünen', 'Dunes de Feu Solaire', 'Dunas de Fuego Solar', 'Dunas do Fogo Solar'],
    'Moonlit Cavern': ['Maanlichtgrot', 'Mondlichthöhle', 'Caverne au Clair de Lune', 'Caverna Lunar', 'Caverna do Luar'],
    'Skyline Run': ['Luchtrace', 'Himmelslauf', 'Course Céleste', 'Carrera Celeste', 'Corrida Celeste'],
    // Phone controller
    'Star Voyager controller': ['Star Voyager-controller', 'Star Voyager-Controller', 'Manette Star Voyager', 'Mando de Star Voyager', 'Comando Star Voyager'],
    'Connect': ['Koppelen', 'Verbinden', 'Connecter', 'Conectar', 'Ligar'],
    'Code shown on the TV': ['Code op de tv', 'Code auf dem Fernseher', 'Code affiché sur la télé', 'Código en la tele', 'Código na televisão'],
    'Connected to the game': ['Gekoppeld met het spel', 'Mit dem Spiel verbunden', 'Connecté au jeu', 'Conectado al juego', 'Ligado ao jogo'],
    'Connected': ['Gekoppeld', 'Verbunden', 'Connecté', 'Conectado', 'Ligado'],
    'How do you want to play?': ['Hoe wil je spelen?', 'Wie möchtest du spielen?', 'Comment veux-tu jouer ?', '¿Cómo quieres jugar?', 'Como queres jogar?'],
    'You can switch at any time with the "Change" button.': ['Je kunt altijd wisselen met de knop "Change".', 'Du kannst jederzeit mit "Change" wechseln.', 'Tu peux changer à tout moment avec "Change".', 'Puedes cambiar cuando quieras con "Change".', 'Podes mudar a qualquer momento com "Change".'],
    'Tilt': ['Kantelen', 'Neigen', 'Inclinaison', 'Inclinar', 'Inclinar'],
    'Gamepad': ['Gamepad', 'Gamepad', 'Manette', 'Mando', 'Comando'],
    'Camera': ['Camera', 'Kamera', 'Caméra', 'Cámara', 'Câmara'],
    'Point the phone at the TV like a remote. Tap Fire to shoot.': ['Richt de telefoon op de tv als een afstandsbediening. Tik op Fire om te schieten.', 'Richte das Handy wie eine Fernbedienung auf den Fernseher. Tippe auf Fire zum Schießen.', 'Vise la télé avec le téléphone comme une télécommande. Appuie sur Fire pour tirer.', 'Apunta a la tele con el móvil como un mando. Toca Fire para disparar.', 'Aponta o telemóvel à televisão como um comando. Toca em Fire para disparar.'],
    'A joystick and buttons on the phone screen.': ['Een joystick en knoppen op het scherm van je telefoon.', 'Ein Joystick und Knöpfe auf dem Handybildschirm.', "Un joystick et des boutons sur l'écran du téléphone.", 'Un joystick y botones en la pantalla del móvil.', 'Um joystick e botões no ecrã do telemóvel.'],
    'Prop the phone up and aim with your arm. The most active way to play.': ['Zet de telefoon neer en richt met je arm. De meest actieve manier van spelen.', 'Stell das Handy auf und ziele mit dem Arm. Die aktivste Art zu spielen.', 'Pose le téléphone et vise avec ton bras. La façon la plus active de jouer.', 'Apoya el móvil y apunta con el brazo. La forma más activa de jugar.', 'Pousa o telemóvel e aponta com o braço. A forma mais ativa de jogar.'],
    'Change': ['Wissel', 'Wechseln', 'Changer', 'Cambiar', 'Mudar'],
    'Remap': ['Verplaats', 'Anordnen', 'Déplacer', 'Mover', 'Mover'],
    'Moving…': ['Verplaatsen…', 'Anordnen…', 'Déplacement…', 'Moviendo…', 'A mover…'],
    'Reset': ['Herstel', 'Zurücksetzen', 'Réinitialiser', 'Restablecer', 'Repor'],
    'Done': ['Klaar', 'Fertig', 'Terminé', 'Listo', 'Pronto'],
    'Drag any button or the d-pad to where you want it': ['Sleep een knop of de d-pad naar waar jij hem wilt', 'Zieh jeden Knopf oder das Steuerkreuz dahin, wo du es willst', 'Fais glisser un bouton ou la croix où tu veux', 'Arrastra cualquier botón o la cruceta adonde quieras', 'Arrasta qualquer botão ou o direcional para onde quiseres'],
    'Turn your phone sideways': ['Draai je telefoon op zijn kant', 'Dreh dein Handy quer', 'Tourne ton téléphone', 'Gira el móvil en horizontal', 'Vira o telemóvel na horizontal'],
    'The gamepad works in landscape: d-pad on the left, Fire on the right.': ['De gamepad werkt liggend: d-pad links, Fire rechts.', 'Das Gamepad funktioniert quer: Steuerkreuz links, Fire rechts.', "La manette fonctionne à l'horizontale : croix à gauche, Fire à droite.", 'El mando funciona en horizontal: cruceta a la izquierda, Fire a la derecha.', 'O comando funciona na horizontal: direcional à esquerda, Fire à direita.'],
    'The extra level is a platformer: choose Gamepad to play it.': ['Het extra level is een platformspel: kies Gamepad om het te spelen.', 'Das Extra-Level ist ein Jump-and-Run: wähle Gamepad.', 'Le niveau bonus est un jeu de plateforme : choisis Manette.', 'El nivel extra es de plataformas: elige Mando.', 'O nível extra é de plataformas: escolhe Comando.'],
    'Start on the TV': ['Start op de tv', 'Auf dem Fernseher starten', 'Lancer sur la télé', 'Empezar en la tele', 'Começar na televisão'],
    'For Google TV, Android TV and Chromecast: the game opens on the TV by itself.': ['Voor Google TV, Android TV en Chromecast: het spel opent vanzelf op de tv.', 'Für Google TV, Android TV und Chromecast: das Spiel öffnet sich von selbst auf dem Fernseher.', 'Pour Google TV, Android TV et Chromecast : le jeu s\'ouvre tout seul sur la télé.', 'Para Google TV, Android TV y Chromecast: el juego se abre solo en la tele.', 'Para Google TV, Android TV e Chromecast: o jogo abre sozinho na televisão.'],
    'or': ['of', 'oder', 'ou', 'o', 'ou'],
    'Not connected': ['Niet gekoppeld', 'Nicht verbunden', 'Non connecté', 'No conectado', 'Não ligado'],
    'Opening the game on the TV…': ['Het spel wordt op de tv geopend…', 'Das Spiel wird auf dem Fernseher geöffnet…', 'Ouverture du jeu sur la télé…', 'Abriendo el juego en la tele…', 'A abrir o jogo na televisão…'],
    'Could not start the game on the TV': ['Het spel kon niet op de tv starten', 'Das Spiel konnte nicht auf dem Fernseher starten', 'Impossible de lancer le jeu sur la télé', 'No se pudo abrir el juego en la tele', 'Não foi possível abrir o jogo na televisão'],
    'Enter the code shown on the TV, or scan the QR code on the TV to fill it in automatically.': ['Vul de code van de tv in, of scan de QR-code op de tv om hem automatisch in te vullen.', 'Gib den Code vom Fernseher ein oder scanne den QR-Code, um ihn automatisch auszufüllen.', 'Saisis le code affiché sur la télé, ou scanne le QR code pour le remplir automatiquement.', 'Escribe el código de la tele o escanea el código QR para rellenarlo automáticamente.', 'Escreve o código da televisão ou lê o código QR para o preencher automaticamente.'],
    'Drone 2': ['Drone 2', 'Drohne 2', 'Drone 2', 'Dron 2', 'Drone 2'],
    'A second helper drone that flies and catches aliens on its own.': ['Een tweede helperdrone die zelf rondvliegt en aliens vangt.', 'Eine zweite Helferdrohne, die selbst herumfliegt und Aliens fängt.', 'Un deuxième drone qui vole et attrape des aliens tout seul.', 'Un segundo dron ayudante que vuela y atrapa aliens por su cuenta.', 'Um segundo drone ajudante que voa e apanha aliens sozinho.'],
    'Extra level': ['Extra level', 'Extra-Level', 'Niveau bonus', 'Nivel extra', 'Nível extra'],
    'Starfall Wetlands': ['Sterrenval-moeras', 'Sternfall-Sumpf', 'Marais des Étoiles', 'Pantano Estelar', 'Pântano Estelar'],
    'Unlock all levels': ['Alle levels openen', 'Alle Level freischalten', 'Débloquer tous les niveaux', 'Desbloquear todos los niveles', 'Desbloquear todos os níveis'],
    'Level 6 clear': ['Level 6 gehaald', 'Level 6 geschafft', 'Niveau 6 réussi', 'Nivel 6 superado', 'Nível 6 concluído'],
  };

  // Texts with a changing part: English pattern -> translations ($1, $2 are filled in)
  const P = [
    [/^Level (\d+)$/, ['Level $1', 'Level $1', 'Niveau $1', 'Nivel $1', 'Nível $1']],
    [/^Level (\d+) clear$/, ['Level $1 gehaald', 'Level $1 geschafft', 'Niveau $1 réussi', 'Nivel $1 superado', 'Nível $1 concluído']],
    [/^Boss: (.+)$/, ['Baas: $1', 'Boss: $1', 'Boss : $1', 'Jefe: $1', 'Chefe: $1']],
    [/^Clear (.+) first$/, ['Haal eerst $1', 'Schaffe zuerst $1', "Termine d'abord $1", 'Supera antes $1', 'Conclui primeiro $1']],
    [/^(.+) cleared!$/, ['$1 gehaald!', '$1 geschafft!', '$1 terminé !', '¡$1 superado!', '$1 concluído!']],

    [/^Discovered (\d+)\/(\d+)$/, ['Ontdekt $1/$2', 'Entdeckt $1/$2', 'Découverts $1/$2', 'Descubiertos $1/$2', 'Descobertos $1/$2']],
    [/^Tip: be a bit quicker, the target time is (.+)$/, ['Tip: wees iets sneller, de doeltijd is $1', 'Tipp: sei etwas schneller, die Zielzeit ist $1', 'Astuce : sois un peu plus rapide, le temps visé est $1', 'Consejo: sé un poco más rápido, el tiempo objetivo es $1', 'Dica: sê um pouco mais rápido, o tempo alvo é $1']],
    [/^\(target (.+)\)$/, ['(doel $1)', '(Ziel $1)', '(objectif $1)', '(objetivo $1)', '(alvo $1)']],
    [/^New in the alien guide: (.+)!$/, ['Nieuw in de aliengids: $1!', 'Neu im Alien-Lexikon: $1!', 'Nouveau dans le guide : $1 !', '¡Nuevo en la guía: $1!', 'Novo no guia: $1!']],
    [/^(.+) complete!$/, ['$1 compleet!', '$1 komplett!', '$1 terminé !', '¡$1 completo!', '$1 completo!']],
    [/^Player (\d) joined!$/, ['Speler $1 doet mee!', 'Spieler $1 ist dabei!', 'Le joueur $1 est là !', '¡Se une el jugador $1!', 'O jogador $1 entrou!']],
    [/^Player (\d) left$/, ['Speler $1 is weg', 'Spieler $1 ist weg', 'Le joueur $1 est parti', 'El jugador $1 se fue', 'O jogador $1 saiu']],
    [/^Player (\d): (.+)$/, ['Speler $1: $2', 'Spieler $1: $2', 'Joueur $1 : $2', 'Jugador $1: $2', 'Jogador $1: $2']],
    [/^Player 2 connected$/, ['Speler 2 gekoppeld', 'Spieler 2 verbunden', 'Joueur 2 connecté', 'Jugador 2 conectado', 'Jogador 2 ligado']],
    [/^The (.+) appears!$/, ['De $1 verschijnt!', 'Der $1 erscheint!', 'Le $1 apparaît !', '¡Aparece el $1!', 'Aparece o $1!']],
    [/^You caught the (.+)!$/, ['Je hebt de $1 gevangen!', 'Du hast den $1 gefangen!', 'Tu as attrapé le $1 !', '¡Atrapaste al $1!', 'Apanhaste o $1!']],
    [/^Catch the (.+): hit it with the blaster or net grenades$/, ['Vang de $1: raak hem met de blaster of netgranaten', 'Fang den $1: triff ihn mit dem Blaster oder Netzgranaten', 'Attrape le $1 : touche-le avec le blaster ou des grenades filet', 'Atrapa al $1: dale con el bláster o granadas red', 'Apanha o $1: acerta-lhe com o blaster ou granadas rede']],
    [/^Net caught (\d+) monsters!$/, ['Net ving $1 monsters!', 'Das Netz fing $1 Monster!', 'Le filet a attrapé $1 monstres !', '¡La red atrapó $1 monstruos!', 'A rede apanhou $1 monstros!']],
    [/^Net caught 1 monster$/, ['Net ving 1 monster', 'Das Netz fing 1 Monster', 'Le filet a attrapé 1 monstre', 'La red atrapó 1 monstruo', 'A rede apanhou 1 monstro']],
    [/^The net tangles the (.+)!$/, ['Het net vangt de $1!', 'Das Netz fesselt den $1!', 'Le filet emmêle le $1 !', '¡La red enreda al $1!', 'A rede prende o $1!']],
    [/^(\d+) \/ (\d+)$/, ['$1 / $2', '$1 / $2', '$1 / $2', '$1 / $2', '$1 / $2']],
  ];

  const I18N = {
    LANGS, NAMES,
    lang: 'en',
    t(text, vars) {
      let out = this.tr(text);
      if (vars) for (const [k, v] of Object.entries(vars)) out = out.split('{' + k + '}').join(v);
      return out;
    },
    // Translate one English text (or return it unchanged)
    tr(text) {
      if (this.lang === 'en' || !text) return text;
      const i = LANGS.indexOf(this.lang) - 1;
      const row = T[text];
      if (row) return row[i] != null ? row[i] : text;
      for (const [re, tr] of P) {
        const m = text.match(re);
        if (m) return tr[i].replace(/\$(\d)/g, (_, n) => this.tr(m[Number(n)]));
      }
      return text;
    },
    setLang(lang) {
      this.lang = LANGS.includes(lang) ? lang : 'en';
      document.documentElement.lang = this.lang;
      this.applyAll();
    },
    guess() {
      const n = (navigator.language || 'en').slice(0, 2).toLowerCase();
      return LANGS.includes(n) ? n : 'en';
    },

    // Keep every text node on the page translated: remember its English original,
    // and re-translate when the page changes (new screens, messages, numbers).
    orig: new WeakMap(),
    shown: new WeakMap(),
    translateNode(node) {
      const cur = node.nodeValue;
      if (!cur || !cur.trim()) return;
      if (this.shown.get(node) !== cur) this.orig.set(node, cur);    // new English text written by the game
      const en = this.orig.get(node);
      const lead = en.match(/^\s*/)[0], trail = en.match(/\s*$/)[0];
      const out = lead + this.tr(en.trim()) + trail;
      this.shown.set(node, out);
      if (out !== cur) node.nodeValue = out;
    },
    walk(root) {
      if (!root) return;
      if (root.nodeType === 3) { this.translateNode(root); return; }
      if (root.nodeType !== 1 || root.tagName === 'SCRIPT' || root.tagName === 'STYLE') return;
      const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      let n;
      while ((n = w.nextNode())) this.translateNode(n);
    },
    applyAll() { this.walk(document.body); },
    watch() {
      if (this._obs) return;
      this._obs = new MutationObserver((list) => {
        for (const m of list) {
          if (m.type === 'characterData') this.translateNode(m.target);
          else m.addedNodes.forEach((n) => this.walk(n));
        }
      });
      this._obs.observe(document.body, { childList: true, subtree: true, characterData: true });
    },
  };
  window.I18N = I18N;
  window.t = (text, vars) => I18N.t(text, vars);
})();
