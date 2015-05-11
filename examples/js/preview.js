jQuery('.config_select').each(function(){
  var stored = store.get(jQuery(this).attr('id'));

  if (stored) {
    jQuery(this).val(stored);
  } else {
    jQuery(this).val(jQuery(this).find('option').first().val());
  }
});

jQuery('.config_select').change(function(){
  store.set(jQuery(this).attr('id'), jQuery(this).val());
  location.reload();
});

// Load libraries
jQuery('head').
  append(jQuery('<link rel="stylesheet" type="text/css" />').attr('href', jQuery('#main').val())).
  append(jQuery('<link rel="stylesheet" type="text/css" />').attr('href', jQuery('#lib').val()));

FormRenderer.BUTTON_CLASS = 'button button-primary btn btn-primary'

// Initialize form
var fr = new FormRenderer(jQuery.extend(
  Fixtures.FormRendererOptions[jQuery('#fixture').val()](),
  {
    screendoorBase: 'http://screendoor.dobt.dev',
    onReady: function(){
      console.log('Form is ready!');
    }
  }
));

fr.save = function(){
  this.state.set({
    hasChanges: false
  });
  console.log(this.getValue());
};
