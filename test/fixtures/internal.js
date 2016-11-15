window.Fixtures || (window.Fixtures = {});

Fixtures.RESPONSE_FIELD = {
  id: 1,
  label: 'Name',
  field_type: 'text'
};

Fixtures.KITCHEN_SINK_FORM = [
  {
    id: 35,
    label: "Text",
    required: true,
    blind: true,
    admin_only: false,
    field_type: "text",
  }, {
    id: 36,
    label: "Paragraph",
    size: "large",
    description: "How would you complete this project?",
    minlength: "10",
    required: false,
    blind: false,
    admin_only: true,
    field_type: "paragraph",
  }, {
    id: 37,
    label: "Checkboxes",
    options: [
      {
        checked: "false",
        label: "Choice #1 (yas)"
      }, {
        checked: "false",
        label: "Choice #2"
      }
    ],
    required: false,
    blind: false,
    admin_only: false,
    field_type: "checkboxes",
  }, {
    id: 38,
    label: "THE SECTION!",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "section_break",
  }, {
    id: 100,
    label: "",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "page_break",
  }, {
    id: 101,
    label: "New page",
    description: "hey hey hey.",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "section_break",
  }, {
    id: 102,
    label: "",
    description: "Howdyhowdyhowdy",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "block_of_text",
  }, {
    id: 39,
    label: "Radio",
    options: [
      {
        checked: "false",
        label: "Choice #1"
      }, {
        checked: "false",
        label: "Choice #2"
      }
    ],
    required: false,
    blind: false,
    admin_only: false,
    field_type: "radio",
  }, {
    id: 40,
    label: "Dropdown",
    options: [
      {
        checked: "false",
        label: "Choice #1"
      }, {
        checked: "false",
        label: "Choice #2"
      }
    ],
    include_blank_option: true,
    required: false,
    blind: false,
    admin_only: false,
    field_type: "dropdown",
  }, {
    id: 41,
    label: "Price",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "price",
  }, {
    id: 42,
    label: "Number",
    units: "things",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "number",
  }, {
    id: 43,
    label: "Date",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "date",
  }, {
    id: 44,
    label: "Time",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "time",
  }, {
    id: 45,
    label: "Website",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "website",
  }, {
    id: 46,
    label: "File",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "file",
  }, {
    id: 47,
    label: "Email",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "email",
  }, {
    id: 48,
    label: "Address",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "address",
  }, {
    id: 49,
    label: "Table",
    columns: [
      {
        label: "column one"
      }, {
        label: "column two"
      }
    ],
    minrows: "2",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "table",
  }, {
    id: 50,
    label: "MapMarker",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "map_marker",
  }, {
    id: 51,
    label: "Phone (US)",
    phone_format: "us",
    required: false,
    blind: false,
    admin_only: false,
    field_type: "phone",
  }, {
    id: 52,
    label: "I accept the terms of Service.",
    required: true,
    blind: false,
    admin_only: false,
    field_type: "confirm",
  }
];

Fixtures.FormRendererOptions = {
  LOADED: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [],
      response: {
        id: 'xxx',
        responses: {}
      },
      afterSubmit: false
    };
  },
  RESPONSE_LOADED: function() {
    return {
      project_id: 'dummy_val',
      response: {
        responses: {
          '1': 'hey'
        }
      },
      afterSubmit: false
    };
  },
  PROJECT_LOADED: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [_.clone(Fixtures.RESPONSE_FIELD)],
      response: {
        id: 'xxx'
      },
      afterSubmit: false
    };
  },
  NOT_LOADED: function() {
    return {
      project_id: 'dummy_val',
      response: {
        id: 'xxx'
      },
      afterSubmit: false
    };
  },
  KITCHEN_SINK: function() {
    return {
      project_id: 'dummy_val',
      response_fields: Fixtures.KITCHEN_SINK_FORM,
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  KITCHEN_SINK_REQ: function(){
    return {
      project_id: 'dummy_val',
      response_fields: _.map(Fixtures.KITCHEN_SINK_FORM, function(rf){
        return _.extend({}, rf, { required: true });
      }),
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  SIZES: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [
        {
          id: 1,
          label: "Text (small)",
          size: 'small',
          maxlength: 20,
          required: true,
          blind: true,
          admin_only: false,
          field_type: "text",
        },
        {
          id: 2,
          label: "Text (medium)",
          size: 'medium',
          minlength: 10,
          required: true,
          blind: true,
          admin_only: false,
          field_type: "text",
        },
        {
          id: 3,
          label: "Text (large)",
          size: 'large',
          minlength: 10,
          maxlength: 20,
          required: true,
          blind: true,
          admin_only: false,
          field_type: "text",
        },
        {
          id: 4,
          label: "paragraph (small)",
          size: 'small',
          minlength: 10,
          maxlength: 20,
          min_max_length_units: 'words',
          required: true,
          blind: true,
          admin_only: false,
          field_type: "paragraph",
        },
        {
          id: 5,
          label: "paragraph (medium)",
          size: 'medium',
          minlength: 10,
          maxlength: 20,
          required: true,
          blind: true,
          admin_only: false,
          field_type: "paragraph",
        },
        {
          id: 6,
          label: "paragraph (large)",
          size: 'large',
          minlength: 10,
          maxlength: 20,
          required: true,
          blind: true,
          admin_only: false,
          field_type: "paragraph",
        },
        {
          id: 7,
          label: "block_of_text (small)",
          size: 'small',
          description: 'i am a block of text, yo',
          required: true,
          blind: true,
          admin_only: false,
          field_type: "block_of_text",
        },
        {
          id: 8,
          label: "block_of_text (medium)",
          size: 'medium',
          description: 'i am a block of text, yo',
          required: true,
          blind: true,
          admin_only: false,
          field_type: "block_of_text",
        },
        {
          id: 9,
          label: "block_of_text (large)",
          size: 'large',
          description: 'i am a block of text, yo',
          required: true,
          blind: true,
          admin_only: false,
          field_type: "block_of_text",
        },
        {
          id: 10,
          label: "section_break (small)",
          size: 'small',
          description: 'i am a section break, yo',
          required: true,
          blind: true,
          admin_only: false,
          field_type: "section_break",
        },
        {
          id: 11,
          label: "section_break (medium)",
          size: 'medium',
          description: 'i am a section break, yo',
          required: true,
          blind: true,
          admin_only: false,
          field_type: "section_break",
        },
        {
          id: 12,
          label: "section_break (large)",
          size: 'large',
          description: 'i am a section break, yo',
          required: true,
          blind: true,
          admin_only: false,
          field_type: "section_break",
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  SHORT: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [
        {
          id: 34,
          label: "",
          required: false,
          blind: false,
          admin_only: false,
          field_type: "identification",
        }, {
          id: 35,
          label: "Text",
          required: false,
          blind: false,
          admin_only: false,
          field_type: "text",
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      },
      afterSubmit: {
        method: 'page',
        html: 'You did it!'
      }
    };
  },
  REPEATING_SECTIONS: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [
        {
          id: 34,
          label: "",
          required: false,
          blind: false,
          admin_only: false,
          field_type: "identification",
        }, {
          id: 35,
          label: "Do you have firearms to register?",
          required: false,
          blind: false,
          admin_only: false,
          field_type: "dropdown",
          options: [
            { label: "Yes" },
            { label: "No" }
          ]
        },
        {
          id: 36,
          type: "group",
          label: "Firearm details",
          conditions: [
            {
              response_field_id: 35,
              method: 'eq',
              value: 'Yes'
            }
          ],
          children: [
            {
              id: 37,
              label: "Type of firearm",
              required: true,
              blind: false,
              admin_only: false,
              field_type: "dropdown",
              options: [
                { label: "Handgun" },
                { label: "Rifle" }
              ]
            },
            {
              id: 39,
              label: "Rifle identifier",
              required: true,
              blind: false,
              admin_only: false,
              field_type: "number",
              conditions: [
                {
                  response_field_id: 37,
                  method: 'eq',
                  value: 'Rifle'
                }
              ]
            },
            {
              id: 38,
              label: "Serial number",
              required: true,
              blind: false,
              admin_only: false,
              field_type: "text",
            }
          ]
        }
      ],
      response: {
        id: 'xxx',
        responses: {
          36: [
            {
              37: "Handgun",
              38: "123456"
            },
            {
              37: "Rifle",
              38: "ABCDEF"
            }
          ]
        }
      }
    };
  },
  CONDITIONAL: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [
        {
          id: 35,
          label: "Do you like conditional form fields?",
          options: [
            {
              label: 'Yes',
              checked: true
            }, {
              label: 'No',
              checked: false
            }
          ],
          required: false,
          blind: false,
          admin_only: false,
          field_type: "dropdown",
        }, {
          id: 36,
          label: "Dang, that sucks.",
          size: 'large',
          conditions: [
            {
              response_field_id: 35,
              method: 'eq',
              value: 'No'
            }
          ],
          required: false,
          blind: false,
          admin_only: false,
          field_type: "section_break",
        }, {
          id: 37,
          label: "What's your email address?",
          required: false,
          blind: false,
          admin_only: false,
          field_type: "email",
        }, {
          id: 38,
          label: "What are the nuclear launch codes?",
          conditions: [
            {
              response_field_id: 37,
              method: 'contains',
              value: 'whitehouse'
            }
          ],
          required: false,
          blind: false,
          admin_only: false,
          field_type: "text",
        }, {
          id: 39,
          label: "What's the most boring part of the job?",
          required: false,
          blind: false,
          admin_only: false,
          field_type: "text",
        }, {
          id: 40,
          label: "Guess a number...",
          required: false,
          blind: false,
          admin_only: false,
          min: 1,
          max: 10,
          field_type: "number",
        }, {
          id: 100,
          label: "",
          required: false,
          blind: false,
          admin_only: false,
          field_type: "page_break",
        }, {
          id: 41,
          label: "Why do you like big numbers?",
          conditions: [
            {
              response_field_id: 40,
              method: 'gt',
              value: '5'
            }
          ],
          required: true,
          blind: false,
          admin_only: false,
          field_type: "text",
        }, {
          id: 101,
          label: "",
          required: false,
          blind: false,
          admin_only: false,
          field_type: "page_break",
        }, {
          id: 42,
          label: "Guess a price...",
          required: false,
          blind: false,
          admin_only: false,
          field_type: "price",
        }, {
          id: 43,
          label: "Why so expensive?",
          conditions: [
            {
              response_field_id: 42,
              method: 'gt',
              value: '5.00'
            }
          ],
          required: false,
          blind: false,
          admin_only: false,
          field_type: "text",
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  CONDITIONAL_TWO: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [
        {
          id: 35,
          label: "Essay 1",
          min_max_length_units: 'words',
          maxlength: 100,
          required: false,
          blind: false,
          admin_only: false,
          field_type: "paragraph",
        }, {
          id: 36,
          label: "Essay 2",
          min_max_length_units: 'characters',
          maxlength: 100,
          required: false,
          blind: false,
          admin_only: false,
          field_type: "paragraph",
        }, {
          id: 37,
          label: "Please elaborate... (lt 10 words)",
          conditions: [
            {
              response_field_id: 35,
              method: 'shorter',
              value: '10'
            }
          ],
          required: false,
          blind: false,
          admin_only: false,
          field_type: "text",
        }, {
          id: 38,
          label: "No more! (gt 10 characters)",
          conditions: [
            {
              response_field_id: 36,
              method: 'longer',
              value: '10'
            }
          ],
          required: false,
          blind: false,
          admin_only: false,
          field_type: "text",
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  CONDITIONAL_THREE: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [
        {
          id: 35,
          label: "Question 1",
          options: [
            {
              label: 'Yes',
              checked: false
            }, {
              label: 'No',
              checked: false
            }
          ],
          required: false,
          blind: false,
          admin_only: false,
          field_type: "checkboxes",
        }, {
          id: 36,
          label: "Question 2",
          options: [
            {
              label: 'Yes',
              checked: false
            }, {
              label: 'No',
              checked: false
            }
          ],
          required: false,
          blind: false,
          admin_only: false,
          field_type: "checkboxes",
        }, {
          id: 37,
          label: "Why do you like the word 'yes'?",
          conditions: [
            {
              response_field_id: 35,
              method: 'contains',
              value: 'Yes'
            }, {
              response_field_id: 36,
              method: 'contains',
              value: 'Yes'
            }
          ],
          required: false,
          blind: false,
          admin_only: false,
          field_type: "text",
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  BLANK: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  BLANK_IDENTIFIED: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [
        {
          id: 34,
          label: "",
          required: false,
          blind: false,
          admin_only: false,
          field_type: "identification",
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  FILE: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [
        {
          id: 35,
          label: "Text",
          file_types: 'images',
          required: false,
          blind: false,
          admin_only: false,
          field_type: "file",
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  },
  TABLE: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [
        {
          id: 49,
          label: "Table",
          columns: [
            {
              label: "column one"
            }, {
              label: "column two"
            }, {
              label: "column three"
            }, {
              label: "column four"
            }
          ],
          minrows: "4",
          preset_values: {
            "column one": ['123', '456', '', 'This is more preset row value goodness']
          },
          required: false,
          blind: false,
          admin_only: false,
          field_type: "table",
        }
      ],
      response: {
        id: 'xxx',
        responses: {}
      }
    };
  }
};

Fixtures.FormRendererOptions.KITCHEN_IMMEDIATE_VALIDATIONS = function(){
  return $.extend(
    Fixtures.FormRendererOptions.KITCHEN_SINK_REQ(),
    { validateImmediately: true }
  );
}

Fixtures.FormRendererOptions.PAGE_STATE = function(){
  return $.extend(
    Fixtures.FormRendererOptions.CONDITIONAL(),
    { plugins: _.union(FormRenderer.prototype.defaults.plugins, ['PageState']) }
  );
}

Fixtures.FormRendererOptions.BOOKMARK_DRAFT = function(){
  return $.extend(
    Fixtures.FormRendererOptions.CONDITIONAL(),
    { plugins: _.union(FormRenderer.prototype.defaults.plugins, ['PageState', 'BookmarkDraft']) }
  );
}

Fixtures.FormRendererOptions.TABLE_REQ = function(){
  table = Fixtures.FormRendererOptions.TABLE();
  table.response_fields[0].required = true;
  return table;
}

Fixtures.FormRendererOptions.CONDITIONAL_THREE_ANY = function(){
  form = Fixtures.FormRendererOptions.CONDITIONAL_THREE();
  form.response_fields[2].condition_method = 'any';
  return form;
}
