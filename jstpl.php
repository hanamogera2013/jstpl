<?php
/*--------------------------------------------------------------------------*
 *  
 *  jstpl.php
 *  
 *  MIT-style license. 
 *  
 *  2013 Hanamogera
 *  
 *--------------------------------------------------------------------------*/

class View_Jstpl 
{
	private $vars;
	private $template_file;
	public function __construct($template_file)
	{
		$this->vars = array();
		$this->template_file = $template_file;
	}
	
	public function assign($name, $value)
	{
		$this->vars[$name] = $value;
	}

	public function show()
	{
		$buffer = "<html><body></body></html>";
		if (file_exists($this->template_file)) {
			$buffer = file_get_contents($this->template_file);
			$json_vars = json_encode($this->vars);
			$script =<<<__JS_END__
<script language='javascript'>
<!--
jstpl.vars = {$json_vars};
//-->
</script>
</head>
__JS_END__;
			$buffer = preg_replace('/<\/head>/', $script, $buffer);			
		}
		echo $buffer;
	}
}
