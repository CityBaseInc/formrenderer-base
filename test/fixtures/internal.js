window.Fixtures || (window.Fixtures = {});

Fixtures.RESPONSE_FIELD = {
  id: 1,
  label: 'Name',
  field_type: 'text'
};

Fixtures.KITCHEN_SINK_FORM = [
  {
    id: 35,
    form_id: 5,
    label: "Text",
    required: true,
    blind: true,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.152Z",
    updated_at: "2014-08-22T20:50:37.152Z",
    field_type: "text",
    cid: null
  }, {
    id: 36,
    form_id: 5,
    label: "Paragraph",
    size: "large",
    description: "How would you complete this project?",
    minlength: "10",
    required: false,
    blind: false,
    admin_only: true,
    created_at: "2014-08-22T20:50:37.169Z",
    updated_at: "2014-08-22T20:50:37.169Z",
    field_type: "paragraph",
    cid: null
  }, {
    id: 37,
    form_id: 5,
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
    created_at: "2014-08-22T20:50:37.187Z",
    updated_at: "2014-08-22T20:50:37.187Z",
    field_type: "checkboxes",
    cid: null
  }, {
    id: 38,
    form_id: 5,
    label: "THE SECTION!",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.217Z",
    updated_at: "2014-08-22T20:50:37.217Z",
    field_type: "section_break",
    cid: null
  }, {
    id: 100,
    form_id: 5,
    label: "",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.217Z",
    updated_at: "2014-08-22T20:50:37.217Z",
    field_type: "page_break",
    cid: null
  }, {
    id: 101,
    form_id: 5,
    label: "New page",
    description: "hey hey hey.",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.217Z",
    updated_at: "2014-08-22T20:50:37.217Z",
    field_type: "section_break",
    cid: null
  }, {
    id: 102,
    form_id: 5,
    label: "",
    description: "Howdyhowdyhowdy",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.217Z",
    updated_at: "2014-08-22T20:50:37.217Z",
    field_type: "block_of_text",
    cid: null
  }, {
    id: 39,
    form_id: 5,
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
    created_at: "2014-08-22T20:50:37.235Z",
    updated_at: "2014-08-22T20:50:37.235Z",
    field_type: "radio",
    cid: null
  }, {
    id: 40,
    form_id: 5,
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
    created_at: "2014-08-22T20:50:37.259Z",
    updated_at: "2014-08-22T20:50:37.259Z",
    field_type: "dropdown",
    cid: null
  }, {
    id: 41,
    form_id: 5,
    label: "Price",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.284Z",
    updated_at: "2014-08-22T20:50:37.284Z",
    field_type: "price",
    cid: null
  }, {
    id: 42,
    form_id: 5,
    label: "Number",
    units: "things",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.300Z",
    updated_at: "2014-08-22T20:50:37.300Z",
    field_type: "number",
    cid: null
  }, {
    id: 43,
    form_id: 5,
    label: "Date",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.319Z",
    updated_at: "2014-08-22T20:50:37.319Z",
    field_type: "date",
    cid: null
  }, {
    id: 44,
    form_id: 5,
    label: "Time",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.336Z",
    updated_at: "2014-08-22T20:50:37.336Z",
    field_type: "time",
    cid: null
  }, {
    id: 45,
    form_id: 5,
    label: "Website",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.456Z",
    updated_at: "2014-08-22T20:50:37.456Z",
    field_type: "website",
    cid: null
  }, {
    id: 46,
    form_id: 5,
    label: "File",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.473Z",
    updated_at: "2014-08-22T20:50:37.473Z",
    field_type: "file",
    cid: null
  }, {
    id: 47,
    form_id: 5,
    label: "Email",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.491Z",
    updated_at: "2014-08-22T20:50:37.491Z",
    field_type: "email",
    cid: null
  }, {
    id: 48,
    form_id: 5,
    label: "Address",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.508Z",
    updated_at: "2014-08-22T20:50:37.508Z",
    field_type: "address",
    cid: null
  }, {
    id: 49,
    form_id: 5,
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
    created_at: "2014-08-22T20:50:37.524Z",
    updated_at: "2014-08-22T20:50:37.524Z",
    field_type: "table",
    cid: null
  }, {
    id: 50,
    form_id: 5,
    label: "MapMarker",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.547Z",
    updated_at: "2014-08-22T20:50:37.547Z",
    field_type: "map_marker",
    cid: null
  }, {
    id: 51,
    form_id: 5,
    label: "Phone (US)",
    phone_format: "us",
    required: false,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.547Z",
    updated_at: "2014-08-22T20:50:37.547Z",
    field_type: "phone",
    cid: null
  }, {
    id: 52,
    form_id: 5,
    label: "I accept the terms of Service.",
    required: true,
    blind: false,
    admin_only: false,
    created_at: "2014-08-22T20:50:37.547Z",
    updated_at: "2014-08-22T20:50:37.547Z",
    field_type: "confirm",
    cid: null
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
          form_id: 5,
          label: "Text (small)",
          size: 'small',
          maxlength: 20,
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        },
        {
          id: 2,
          form_id: 5,
          label: "Text (medium)",
          size: 'medium',
          minlength: 10,
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        },
        {
          id: 3,
          form_id: 5,
          label: "Text (large)",
          size: 'large',
          minlength: 10,
          maxlength: 20,
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        },
        {
          id: 4,
          form_id: 5,
          label: "paragraph (small)",
          size: 'small',
          minlength: 10,
          maxlength: 20,
          min_max_length_units: 'words',
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "paragraph",
          cid: null
        },
        {
          id: 5,
          form_id: 5,
          label: "paragraph (medium)",
          size: 'medium',
          minlength: 10,
          maxlength: 20,
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "paragraph",
          cid: null
        },
        {
          id: 6,
          form_id: 5,
          label: "paragraph (large)",
          size: 'large',
          minlength: 10,
          maxlength: 20,
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "paragraph",
          cid: null
        },
        {
          id: 7,
          form_id: 5,
          label: "block_of_text (small)",
          size: 'small',
          description: 'i am a block of text, yo',
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "block_of_text",
          cid: null
        },
        {
          id: 8,
          form_id: 5,
          label: "block_of_text (medium)",
          size: 'medium',
          description: 'i am a block of text, yo',
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "block_of_text",
          cid: null
        },
        {
          id: 9,
          form_id: 5,
          label: "block_of_text (large)",
          size: 'large',
          description: 'i am a block of text, yo',
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "block_of_text",
          cid: null
        },
        {
          id: 10,
          form_id: 5,
          label: "section_break (small)",
          size: 'small',
          description: 'i am a section break, yo',
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "section_break",
          cid: null
        },
        {
          id: 11,
          form_id: 5,
          label: "section_break (medium)",
          size: 'medium',
          description: 'i am a section break, yo',
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "section_break",
          cid: null
        },
        {
          id: 12,
          form_id: 5,
          label: "section_break (large)",
          size: 'large',
          description: 'i am a section break, yo',
          required: true,
          blind: true,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "section_break",
          cid: null
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
          form_id: 5,
          label: "",
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "identification",
          cid: null
        }, {
          id: 35,
          form_id: 5,
          label: "Text",
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
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
  CONDITIONAL: function() {
    return {
      project_id: 'dummy_val',
      response_fields: [
        {
          id: 35,
          form_id: 5,
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
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "dropdown",
          cid: null
        }, {
          id: 36,
          form_id: 5,
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
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "section_break",
          cid: null
        }, {
          id: 37,
          form_id: 5,
          label: "What's your email address?",
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "email",
          cid: null
        }, {
          id: 38,
          form_id: 5,
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
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        }, {
          id: 39,
          form_id: 5,
          label: "What's the most boring part of the job?",
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        }, {
          id: 40,
          form_id: 5,
          label: "Guess a number...",
          required: false,
          blind: false,
          admin_only: false,
          min: 1,
          max: 10,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "number",
          cid: null
        }, {
          id: 100,
          form_id: 5,
          label: "",
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.217Z",
          updated_at: "2014-08-22T20:50:37.217Z",
          field_type: "page_break",
          cid: null
        }, {
          id: 41,
          form_id: 5,
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
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        }, {
          id: 101,
          form_id: 5,
          label: "",
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.217Z",
          updated_at: "2014-08-22T20:50:37.217Z",
          field_type: "page_break",
          cid: null
        }, {
          id: 42,
          form_id: 5,
          label: "Guess a price...",
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "price",
          cid: null
        }, {
          id: 43,
          form_id: 5,
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
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
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
          form_id: 5,
          label: "Essay 1",
          min_max_length_units: 'words',
          maxlength: 100,
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "paragraph",
          cid: null
        }, {
          id: 36,
          form_id: 5,
          label: "Essay 2",
          min_max_length_units: 'characters',
          maxlength: 100,
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "paragraph",
          cid: null
        }, {
          id: 37,
          form_id: 5,
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
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
        }, {
          id: 38,
          form_id: 5,
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
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
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
          form_id: 5,
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
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "checkboxes",
          cid: null
        }, {
          id: 36,
          form_id: 5,
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
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "checkboxes",
          cid: null
        }, {
          id: 37,
          form_id: 5,
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
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "text",
          cid: null
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
          form_id: 5,
          label: "",
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "identification",
          cid: null
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
          form_id: 5,
          label: "Text",
          file_types: 'images',
          required: false,
          blind: false,
          admin_only: false,
          created_at: "2014-08-22T20:50:37.152Z",
          updated_at: "2014-08-22T20:50:37.152Z",
          field_type: "file",
          cid: null
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
          form_id: 5,
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
          created_at: "2014-08-22T20:50:37.524Z",
          updated_at: "2014-08-22T20:50:37.524Z",
          field_type: "table",
          cid: null
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
