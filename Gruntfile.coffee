module.exports = (grunt) ->

  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-cssmin')
  grunt.loadNpmTasks('grunt-eco')
  grunt.loadNpmTasks('grunt-contrib-sass')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-release')
  grunt.loadNpmTasks('grunt-karma')

  grunt.initConfig

    pkg: '<json:package.json>'
    srcFolder: 'src'
    compiledFolder: 'compiled' # Temporary holding area.
    distFolder: 'dist'
    vendorFolder: 'vendor'
    testFolder: 'test'

    eco:
      all:
        options:
          basePath: '<%= srcFolder %>/templates'
        files:
          '<%= compiledFolder %>/templates.js': '<%= srcFolder %>/templates/**/*.eco'

    coffee:
      all:
        files:
          '<%= compiledFolder %>/scripts.js': [
            '<%= srcFolder %>/rivets_config.coffee'
            '<%= srcFolder %>/main.coffee'
            '<%= srcFolder %>/validators/base_validator.coffee'
            '<%= srcFolder %>/validators/*.coffee'
            '<%= srcFolder %>/models.coffee'
            '<%= srcFolder %>/views.coffee'
          ]
          '<%= testFolder %>/support/fixtures.js': [
            '<%= testFolder %>/support/fixtures.coffee'
          ]

    concat:
      all:
        files:
          '<%= distFolder %>/formrenderer.standalone.uncompressed.js': '<%= compiledFolder %>/*.js'
          '<%= compiledFolder %>/vendor.js': [
            'bower_components/jquery-form/jquery.form.js'
            'bower_components/store.js/store.js'
            'bower_components/underscore/underscore.js'
            'bower_components/backbone/backbone.js'
            'bower_components/underscore.string/dist/underscore.string.min.js'
            'bower_components/underscore.simpleformat.js/index.js'
            'bower_components/underscore.toboolean.js/index.js'
            'bower_components/beforeunload.js/index.js'
            'bower_components/ajb-sanitize/lib/sanitize.js'
            'bower_components/ajb-sanitize/lib/sanitize/config/relaxed.js'
            'bower_components/underscore.sanitize.js/index.js'
            'bower_components/backbone-deep-model/distribution/deep-model.js'
            'bower_components/rivets/dist/rivets.js'
            'bower_components/iso-country-names/index.js'
          ]
      dist:
        files:
          '<%= distFolder %>/formrenderer.uncompressed.js': [
            '<%= compiledFolder %>/vendor.js'
            '<%= distFolder %>/formrenderer.standalone.uncompressed.js'
          ]
        options:
          # Add lazy encapsulation
          banner: '(function(window){'
          footer: '})(window);'

    sass:
      all:
        options:
          sourcemap: 'none'
        files:
          '<%= distFolder %>/formrenderer.uncompressed.css': '<%= srcFolder %>/styles/base.scss'

    cssmin:
      dist:
        files:
          '<%= distFolder %>/formrenderer.css': '<%= distFolder %>/formrenderer.uncompressed.css'

    clean:
      compiled:
        ['<%= compiledFolder %>']

    uglify:
      dist:
        files:
          '<%= distFolder %>/formrenderer.standalone.js': '<%= distFolder %>/formrenderer.standalone.uncompressed.js'
          '<%= distFolder %>/formrenderer.js': '<%= distFolder %>/formrenderer.uncompressed.js'

    watch:
      all:
        files: ['<%= srcFolder %>/**/*.{coffee,eco,scss}']
        tasks: 'default'

    # # To test, run `grunt --no-write -v release`
    release:
      options:
        file: 'bower.json'
        npm: false

    karma:
      main:
        options:
          configFile: '<%= testFolder %>/karma.conf.coffee'
          singleRun: true
          reporters: 'dots'
      dev:
        options:
          configFile: '<%= testFolder %>/karma.conf.coffee'
          reporters: 'dots'
          autoWatch: true

  grunt.registerTask 'default', ['eco:all', 'coffee:all', 'concat:all', 'concat:dist', 'sass:all', 'clean:compiled']
  grunt.registerTask 'dist', ['cssmin:dist', 'uglify:dist']
  grunt.registerTask 'all', ['default', 'dist']
  grunt.registerTask 'test', ['karma:main']
