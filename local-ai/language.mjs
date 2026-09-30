// Conservative corrections of observed Azerbaijani spelling, address and case errors.
// This does not supply or invent institutional facts.
export function polishAzerbaijani(text){
 const words=new Map([['TEC-yə','TEC-ə'],['İnteressən','Marağın'],['interessən','marağın'],['marağınız','marağın'],['dərslərinizə','dərslərinə'],['dərslərinizi','dərslərini'],['dərsləriniz','dərslərin'],['vaxtınızı','vaxtını'],['vaxtınızda','vaxtında'],['vaxtınız','vaxtın'],['bacarıqlarınızı','bacarıqlarını'],['seçin','seç'],['ayırın','ayır'],['verin','ver']]);
 return text.replace(/https?:\/\/\S+|[\p{L}]+(?:-[\p{L}]+)?/gu,word=>{if(word.startsWith('https://')||word.startsWith('http://'))return word;return words.get(word)??word;})
 .replace(/səni (daha çox )?maraqlandığı/gu,'səni $1maraqlandırdığı')
 .replace(/vaxtın ayır/gu,'vaxt ayır')
 .replace(/ilk növbədə seçimi ola bilər/gu,'ilk seçim ola bilər')
 .replace(/fəaliyyətlərinə iştirak/gu,'fəaliyyətlərində iştirak')
 .replace(/tədbirlərinə iştirak/gu,'tədbirlərində iştirak').trim();
}

export function keepRequestedLength(text,question,kind){
 if(kind!=='advice')return text;
 const q=question.toLocaleLowerCase('az').replaceAll('ə','e').replaceAll('ı','i');
 if(/(?:yalniz|tekce|ancaq)?\s*bir addim|birinci addim/.test(q))return text.split(/(?<=[.!?])\s+/u)[0].replace(/(seç|bax|yoxla|soruş|araşdır)\s+və[^.!?]*/u,'$1');
 return text;
}
