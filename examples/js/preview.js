$('.config_select').each(function(){
  var stored = store.get($(this).attr('id'));

  if (stored) {
    $(this).val(stored);
  } else {
    $(this).val($(this).find('option').first().val());
  }
});

$('.config_select').change(function(){
  store.set($(this).attr('id'), $(this).val());
  location.reload();
});

// Load libraries
$('head').
  append($('<link rel="stylesheet" type="text/css" />').attr('href', $('#main').val())).
  append($('<link rel="stylesheet" type="text/css" />').attr('href', $('#lib').val()));

FormRenderer.BUTTON_CLASS = 'button button-primary btn btn-primary'

// Override save to just console.log the value
FormRenderer.prototype.save = function(options){
  console.log(this.getValue());
  this.state.set({
    hasChanges: false
  });
  if (options && options.success) {
    options.success();
  }
};

// Initialize form
new FormRenderer($.extend(
  Fixtures.FormRendererOptions[$('#fixture').val()](),
  {
    screendoorBase: 'http://screendoor.dobt.dev',
    onReady: function(){
      console.log('Form is ready!');
    }
  }
));
