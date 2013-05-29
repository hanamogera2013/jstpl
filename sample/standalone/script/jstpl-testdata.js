/*--------------------------------------------------------------------------*
 *  
 *  jstpl-testdata.js
 *  
 *  MIT-style license. 
 *  
 *  2013 Hanamogera
 *  
 *--------------------------------------------------------------------------*/
(function (key, data) {
	
	data.NAMAE = 'はなもげら';
	data.BIRTH_DAY = '1980/3/15';
	data.FAVORITE_COLOR = 'red';
	data.LIST_FAVORITE_LANGS = ['PHP', 'JavaScript', 'C'];
	data.IS_MALE = true;
	data.COUNTRY_CD = 'JP';
	data.PREF_CD = '13';
	data.MAP_PREF_CD = { '13':'東京', '27':'大阪', '0':'その他' };
	data.MAP_COLOR = { red:'赤い', blue:'青い', yellow:'黄色い' };

	jstpl.addTestData(key, data);
})('sample.html', {});