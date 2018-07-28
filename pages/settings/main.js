settings.get('theme', (value) => {
	$('#'+value).click();
	if (value == 'dark') {
	  $('head').append('<link rel="stylesheet" href="../../vendor/bootstrap_dark.min.css" type="text/css" />');
	}
});

settings.get('controlsStyle', (value) => {
	$('#'+value).click();
});

settings.get('downloadsDirectory', (value) => {
	$('#location').val(value);
});

$(':file').on('change', function() {
  var input = $(this)
  input.trigger('fileselect');
});

$(':file').on('fileselect', (event) => {
  const selectedPath = document.getElementById("downloads-selector").files[0].path;
  $("#location").val(selectedPath);
});

$('#save').on('click', () => {
	settings.set('theme', $('input[name="theme"]:checked').val());
	settings.set('controlsStyle', $('input[name="titlebar"]:checked').val());
	settings.set('downloadsDirectory', $('#location').val());
});