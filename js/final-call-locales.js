/* Final Call dialogue — verbatim translations provided by the author.
   Matched by stable cue ID; never machine-translate this content on the fly. */
(()=>{
  'use strict';
  const ids=["ringing","connect","michael-1","franklin-1","trevor-1","michael-2","trevor-2","franklin-2","michael-3","trevor-3","laughter","franklin-3","michael-4","trevor-4","michael-5","franklin-4","disconnect"];
  const languages={
  "fr": [
    "Sonnerie de téléphone",
    "Appel connecté",
    "Tu sais ce qui est drôle ? On a passé notre vie à essayer de fuir cette ville. Et chaque fois qu'on croyait enfin s'en être sortis... Los Santos nous ramenait aussitôt.",
    "C'est peut-être ça, le problème, mec. On était tellement occupés à courir après le prochain gros coup... qu'on n'a jamais pris le temps d'apprécier ce qu'on avait déjà.",
    "Oh, Jésus-Christ. On va vraiment se faire des adieux larmoyants ? Parce que j'avais pas signé pour chialer au téléphone aujourd'hui.",
    "Personne n'a parlé d'adieux, Trevor.",
    "Ouais... bon... tant mieux. Parce que même si je vous déteste tous les deux... ça a été une sacrée aventure.",
    "Treize ans, mec. Toutes les erreurs, toutes les folies... je changerais rien.",
    "Moi non plus.",
    "Bon, peut-être deux ou trois trucs. Beaucoup de trucs, en fait.",
    "Rires",
    "Quoi qu'il arrive ensuite... ils ne nous oublieront pas.",
    "Non. Ils ne nous oublieront pas.",
    "Alors... même heure, dans une autre vie ?",
    "Prenez soin de vous.",
    "On se retrouve de l'autre côté.",
    "Appel terminé"
  ],
  "es": [
    "Suena el teléfono",
    "Llamada conectada",
    "¿Sabes qué es lo gracioso? Nos hemos pasado la vida intentando escapar de esta ciudad. Y cada vez que creíamos haberlo conseguido... Los Santos nos arrastraba de vuelta.",
    "Tal vez ese sea el punto, hermano. Estábamos tan ocupados buscando siempre algo más grande... que nunca nos detuvimos a apreciar lo que ya teníamos.",
    "Oh, Jesucristo. ¿En serio vamos a ponernos sentimentales con las despedidas? Porque yo no me apunté a esto para terminar llorando por teléfono hoy.",
    "Nadie se está despidiendo, Trevor.",
    "Sí... bueno... mejor. Porque por mucho que los odie a los dos... ha sido toda una aventura.",
    "Trece años, hermano. Todos los errores, todas las locuras... no cambiaría nada.",
    "Yo tampoco.",
    "Bueno, tal vez algunas cosas. Muchas cosas, en realidad.",
    "Risas",
    "Pase lo que pase después... no se van a olvidar de nosotros.",
    "No. No se olvidarán.",
    "Entonces... ¿a la misma hora, en otra vida?",
    "Cuídense.",
    "Nos vemos del otro lado.",
    "Llamada finalizada"
  ],
  "de": [
    "Telefon klingelt",
    "Verbindung hergestellt",
    "Wisst ihr, was witzig ist? Wir haben unser ganzes Leben lang versucht, aus dieser Stadt rauszukommen. Und jedes Mal, wenn wir dachten, wir hätten es geschafft... hat Los Santos uns wieder reingezogen.",
    "Vielleicht ist das ja der Punkt, Mann. Wir waren so damit beschäftigt, dem nächsten großen Ding hinterherzujagen... dass wir nie zu schätzen wussten, was wir längst hatten.",
    "Ach, du lieber Gott. Ziehen wir jetzt ernsthaft diese rührselige Abschiedsnummer ab? Ich hab mich jedenfalls nicht dafür gemeldet, heute am Telefon zu flennen.",
    "Niemand verabschiedet sich, Trevor.",
    "Ja... na ja... gut so. Denn so sehr ich euch beide auch hasse... es war ein verdammt wilder Ritt.",
    "Dreizehn Jahre, Mann. All die Fehler, all der verrückte Scheiß... ich würde nichts davon ändern.",
    "Ich auch nicht.",
    "Okay, vielleicht ein paar Dinge. Eigentlich ziemlich viele.",
    "Gelächter",
    "Was auch immer als Nächstes kommt... sie werden uns nicht vergessen.",
    "Nein. Werden sie nicht.",
    "Also... gleiche Zeit, anderes Leben?",
    "Passt auf euch auf.",
    "Wir sehen uns auf der anderen Seite.",
    "Anruf beendet"
  ],
  "it": [
    "Il telefono squilla",
    "Chiamata connessa",
    "Sapete cosa fa ridere? Abbiamo passato tutta la vita a cercare di scappare da questa città. E ogni volta che pensavamo di esserci riusciti... Los Santos ci trascinava di nuovo dentro.",
    "Forse è proprio questo il punto, amico. Eravamo così impegnati a inseguire la prossima grande occasione... che non ci siamo mai fermati ad apprezzare quello che avevamo già.",
    "Oh, Gesù Cristo. Stiamo davvero facendo la scenetta dell'addio strappalacrime? Perché oggi non avevo certo intenzione di mettermi a piangere al telefono.",
    "Nessuno sta dicendo addio, Trevor.",
    "Sì... be'... meno male. Perché, per quanto vi odi tutti e due... è stato un viaggio pazzesco.",
    "Tredici anni, amico. Tutti gli errori, tutte le follie... non cambierei nulla.",
    "Nemmeno io.",
    "Okay, forse un paio di cose. Un sacco di cose, a dire il vero.",
    "Risate",
    "Qualunque cosa ci aspetti... non si dimenticheranno di noi.",
    "No. Non si dimenticheranno.",
    "Allora... stessa ora, in un'altra vita?",
    "Prendetevi cura di voi.",
    "Ci vediamo dall'altra parte.",
    "Chiamata terminata"
  ]
};
  const store=window.__tfwFinalCallTranslations||Object.create(null);
  for(const [locale,lines] of Object.entries(languages)){
    store[locale]=Object.fromEntries(ids.map((id,i)=>[id,lines[i]]));
  }
  window.__tfwFinalCallTranslations=store;
})();
