Fixtures.Validation = {
  "MIN_MAX_LENGTH_CHARACTERS": {
    "valid": ["Boooo", "   Boooo        ", " Boooooooo  ", ";oooo:"],
    "invalid": ["Boo", "Boooooooooooooooooooo"]
  },
  "MIN_MAX_LENGTH_WORDS": {
    "valid": ["Boo hoo   ", " Boo hoo hoo"],
    "invalid": [" Boo ", "Boo hoo  hoo hoo   "]
  },
  "MIN_MAX": {
    "valid": ["5.01", "10.00"],
    "invalid": ["1", "4.99999", "10.9"]
  },
  "INTEGER": {
    "valid": ["1", "3,000"],
    "invalid": ["1.2", "1.0"]
  },
  "PRICE": {
    "valid": [{
      "cents": "1",
      "dollars": ""
    }, {
      "cents": "",
      "dollars": "$1"
    }, {
      "cents": "",
      "dollars": "1"
    }, {
      "cents": "",
      "dollars": "0"
    }, {
      "cents": "0",
      "dollars": ""
    }, {
      "cents": "01",
      "dollars": "2,000"
    }, {
      "cents": "01",
      "dollars": "2,000,000"
    }],
    "invalid": [{
      "dollars": "a"
    }, {
      "dollars": "1$"
    }, {
      "dollars": "1a"
    }, {
      "cents": "a"
    }, {
      "cents": "1a"
    }, {
      "dollars": "3a",
      "cents": "1"
    }, {
      "dollars": "3",
      "cents": "100z"
    }, {
      "dollars": "3-000",
      "cents": "0"
    }]
  },
  "DATE": {
    "valid": [{
      "month": "2",
      "day": "3",
      "year": "2011"
    },{
      "month": "2",
      "day": "29",
      "year": "2012"
    }],
    "invalid": [{
      "month": "2"
    }, {
      "month": "2",
      "day": "3"
    },{
      "month": "11",
      "day": "31",
      "year": "2015"
    },
    {
      "month": "2",
      "day": "29",
      "year": "2013"
    },
    {
      "month": "2",
      "day": "29",
      "year": "asdf"
    }]
  },
  "DATE_DISABLE_YEAR": {
    "valid": [
      {
        "month": "2",
        "day": "3"
      }
    ],
    "invalid": [
      {
        "month": "2"
      },
      {
        "month": "11",
        "day": "31"
      }
    ]
  },
  "TIME": {
    "valid": [{
      "hours": "1",
      "minutes": "1"
    }],
    "invalid": [{
      "hours": "0"
    }, {
      "hours": "0",
      "minutes": "1"
    }]
  },
  "EMAIL": {
    "valid": ["a@a"],
    "invalid": ["a"]
  },
  "NUMBER": {
    "invalid": ["a", "a123", "123+","12 bizzles"],
    "valid": ["123", "1,23", "1.23", "1-23", "+15107671234","12 beezles","12Beezles", "123 "]
  },
  "US_PHONE": {
    "invalid": ["510123456", "(123", "123-4567"],
    "valid": ["1234567890", "+1 510 123 4567", "(123)456-7890", "1230000000 ext 123"]
  },
  "INTL_PHONE": {
    "invalid": ["asdf", "123456"],
    "valid": ["1234567"]
  }
}
;Fixtures.Conditional = {
  "values": {
    "address": {
      "tests": [
        {
          "in": {
            "street": "foo",
            "city": "bar",
            "country": "US"
          },
          "out": "foo bar US"
        },
        {
          "in": {
            "street": "foo",
            "city": "bar",
            "country": "baz"
          },
          "out": "foo bar baz"
        }
      ]
    },
    "checkboxes": {
      "attrs": {
        "field_options": {
          "options": [
            {
              "label": "bar (baz)",
              "checked": false
            }
          ]
        }
      },
      "tests": [
        {
          "in": {
            "bar (baz)": true,
            "Other": "who"
          },
          "out": "bar (baz) who"
        }
      ]
    },
    "radio": {
      "tests": [
        {
          "in": "yo",
          "out": "yo"
        }
      ]
    },
    "table": {
      "attrs": {
        "field_options": {
          "columns": [
            {
              "label": "one"
            },
            {
              "label": "two"
            }
          ]
        }
      },
      "tests": [
        {
          "in": {
            "one": ["a", "b"],
            "two": ["c", "d"]
          },
          "out": "a b c d"
        }
      ]
    },
    "date": {
      "tests": [
        {
          "in": {
            "month": 11,
            "day": 11,
            "year": 1234
          },
          "out": "11/11/1234"
        }
      ]
    },
    "time": {
      "tests": [
        {
          "in": {
            "minutes": 12,
            "hours": 12,
            "am_pm": "AM"
          },
          "out": "12:12:00 AM"
        }
      ]
    },
    "price": {
      "tests": [
        {
          "in": {
            "dollars": 1
          },
          "out": "1.00"
        },
        {
          "in": {
            "cents": 99
          },
          "out": "0.99"
        }
      ]
    },
    "dropdown": {
      "tests": [
        {
          "in": "Foo",
          "out": "Foo"
        }
      ]
    },
    "email": {
      "tests": [
        {
          "in": "Foo",
          "out": "Foo"
        }
      ]
    },
    "number": {
      "tests": [
        {
          "in": "Foo",
          "out": "Foo"
        }
      ]
    },
    "paragraph": {
      "tests": [
        {
          "in": "Foo",
          "out": "Foo"
        }
      ]
    },
    "text": {
      "tests": [
        {
          "in": "Foo",
          "out": "Foo"
        }
      ]
    },
    "website": {
      "tests": [
        {
          "in": "Foo",
          "out": "Foo"
        }
      ]
    },
    "confirm": {
      "tests": [
        {
          "in": "t",
          "out": "Yes"
        }
      ]
    }
  },
  "methods": {
    "eq": {
      "value": "asd",
      "true": ["asd", "ASD"],
      "false": ["as"]
    },
    "not": {
      "value": "asd",
      "false": ["asd", "ASD"],
      "true": ["as"]
    },
    "contains": {
      "value": "foo (bar)",
      "true": ["foo (bar)", "foo (bar) baz"],
      "false": ["foo bar", "foo (bar"]
    },
    "does_not_contain": {
      "value": "foo (bar)",
      "false": ["foo (bar)", "foo (bar) baz"],
      "true": ["foo bar", "foo (bar"]
    },
    "lt": {
      "value": "12.99",
      "true": ["12.98", "12", "1"],
      "false": ["12.999", "13", "100"]
    },
    "gt": {
      "value": "12.99",
      "true": ["12.999", "13", "100"],
      "false": ["12.98", "12", "1"]
    },
    "shorter": {
      "value": "5",
      "true": ["asdf", "a"],
      "false": ["asdfa", "asdfaa"]
    },
    "longer": {
      "value": "5",
      "true": ["asdfaa", "asdfaaa"],
      "false": ["asdfa", "a"]
    },
    "present": {
      "value": "",
      "true": ["a", " a"],
      "false": ["", "   ", "\n\r", "\u00a0"]
    },
    "blank": {
      "value": "",
      "false": ["a"],
      "true": [""]
    }
  }
}
;