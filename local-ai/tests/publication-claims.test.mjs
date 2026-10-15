import test from 'node:test';
import assert from 'node:assert/strict';
import {removeUnsupportedPublicationClaims} from '../language.mjs';

test('missing contacts and schedules do not turn into publication promises',()=>{
 const knowledge='Psixoloqun otağı və əlaqə detalları verilməyib.';
 assert.equal(removeUnsupportedPublicationClaims('Dekanlığa müraciət et. Psixoloqun otağı və qəbul saatları rəsmi elanlarda dərc olunur.',knowledge),'Dekanlığa müraciət et.');
 assert.equal(removeUnsupportedPublicationClaims('Tədbir 21 oktyabrdadır. Tədbirin dəqiq saatı və auditoriyası elanlarda açıqlanacaq.','Dəqiq saat təqdim edilməyib.'),'Tədbir 21 oktyabrdadır.');
});
test('explicitly sourced publication facts and supplied hours are retained',()=>{
 const reply='Qəbul saatları rəsmi elanlarda dərc olunur.';
 assert.equal(removeUnsupportedPublicationClaims(reply,reply+' Başqa məlumat verilməyib.'),reply);
 assert.equal(removeUnsupportedPublicationClaims('Kitabxana 09:00–18:00 açıqdır.','Korpus verilməyib.'),'Kitabxana 09:00–18:00 açıqdır.');
});


test('missing local knowledge is not proof the official source has not published a detail',()=>{
 assert.equal(removeUnsupportedPublicationClaims('Tyutora müraciət et. Psixoloqun otaq nömrəsi, qəbul saatı və telefonu rəsmi mənbələrdə açıqlanmayıb.','Bu detallar verilməyib.'),'Tyutora müraciət et.');
 assert.equal(removeUnsupportedPublicationClaims('Tyutora müraciət et. Psixoloqun otağı, qəbul saatı və əlçatanlıq detalları rəsmi mənbələrdə verilməyib.','Bu detallar verilməyib.'),'Tyutora müraciət et.');
 assert.equal(removeUnsupportedPublicationClaims('Tədbir 21 oktyabrdadır. Dəqiq saat hələ elan edilməyib.','Saat verilməyib.'),'Tədbir 21 oktyabrdadır.');
});
