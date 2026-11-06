(() => {
  const messages = {
    en: {title:"A moment to reconnect.",description:"QuestRealm couldn’t reach the network. Reconnect to load your account, quests, and focus timer.",retry:"Try again",note:"Saving changes and earning quest rewards require a connection."},
    az: {title:"Yenidən qoşulmaq vaxtıdır.",description:"QuestRealm şəbəkəyə qoşula bilmədi. Hesabını, tapşırıqlarını və fokus taymerini açmaq üçün yenidən qoşul.",retry:"Yenidən cəhd et",note:"Dəyişiklikləri saxlamaq və tapşırıq mükafatlarını qazanmaq üçün bağlantı lazımdır."},
    tr: {title:"Yeniden bağlanma zamanı.",description:"QuestRealm ağa bağlanamadı. Hesabını, görevlerini ve odak zamanlayıcını yüklemek için yeniden bağlan.",retry:"Tekrar dene",note:"Değişiklikleri kaydetmek ve görev ödülleri kazanmak için bağlantı gerekir."},
    ru: {title:"Время подключиться снова.",description:"QuestRealm не удалось подключиться к сети. Подключитесь, чтобы загрузить аккаунт, задания и таймер фокуса.",retry:"Повторить",note:"Для сохранения изменений и получения наград нужно подключение."},
  };
  let language="en",theme=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";
  try { const saved=localStorage.getItem("questrealm.language"); if(Object.hasOwn(messages,saved))language=saved; const savedTheme=localStorage.getItem("questrealm.theme");if(savedTheme==="light"||savedTheme==="dark")theme=savedTheme; } catch { /* The fallback remains usable without storage. */ }
  document.documentElement.lang=language;
  document.documentElement.dataset.theme=theme;
  const copy=messages[language];
  document.title=copy.title+" · QuestRealm";
  document.querySelectorAll("[data-offline]").forEach(element=>{const key=element.getAttribute("data-offline");if(Object.hasOwn(copy,key))element.textContent=copy[key];});
})();
