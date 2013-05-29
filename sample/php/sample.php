<?php

include_once('jstpl.php');

$view = new View_Jstpl('sample.html');
$view->assign('NAMAE', 'はなもげら');
$view->assign('BIRTH_DAY', '1980/3/15');
$view->assign('FAVORITE_COLOR', 'red');
$view->assign('LIST_FAVORITE_LANGS', array('PHP', 'JavaScript', 'C'));
$view->assign('IS_MALE', true);
$view->assign('COUNTRY_CD', 'JP');
$view->assign('PREF_CD', '13');
$view->assign('MAP_PREF_CD', array('13'=>'東京', '27'=>'大阪', '0'=>'その他'));
$view->assign('MAP_COLOR', array('red'=>'赤い', 'blue'=>'青い', 'yellow'=>'黄色い'));

$view->show();
