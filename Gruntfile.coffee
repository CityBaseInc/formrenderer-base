module.exports = (grunt) ->

  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-cssmin')
  grunt.loadNpmTasks('grunt-eco')
  grunt.loadNpmTasks('grunt-contrib-stylus')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-release')
  grunt.loadNpmTasks('grunt-karma')
  grunt.loadNpmTasks('grunt-text-replace')

  grunt.initConfig

    pkg: '<json:package.json>'
    configFolder: 'config'
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
            '<%= configFolder %>/rivets.coffee'
            '<%= srcFolder %>/main.coffee'
            '<%= srcFolder %>/validators/base_validator.coffee'
            '<%= srcFolder %>/validators/*.coffee'
            '<%= srcFolder %>/models.coffee'
            '<%= srcFolder %>/views.coffee'
          ]
          '<%= testFolder %>/support/fixtures.js': [
            '<%= testFolder %>/support/fixtures.coffee'
          ]

    replace:
      font_awesome:
        src: ['bower_components/font-awesome/css/font-awesome.css']
        dest: '<%= compiledFolder %>/font-awesome.css'
        replacements: [
          from: "url('../"
          to: "url('https://cdnjs.cloudflare.com/ajax/libs/font-awesome/3.2.1/"
        ]

    concat:
      all:
        files:
          '<%= distFolder %>/formrenderer.js': '<%= compiledFolder %>/*.js'
          '<%= vendorFolder %>/js/vendor.js': [
            'bower_components/jquery/dist/jquery.js'
            'bower_components/store.js/store.js'
            'bower_components/underscore/underscore.js'
            'bower_components/backbone/backbone.js'
            'bower_components/underscore.string/dist/underscore.string.min.js'
            'bower_components/underscore.simpleformat.js/index.js'
            'bower_components/underscore.toboolean.js/index.js'
            'bower_components/before_unload.js/index.js'
            'bower_components/sanitize.js/lib/sanitize.js'
            'bower_components/sanitize.js/lib/sanitize/config/basic.js'
            'bower_components/underscore.sanitize.js/index.js'
            'bower_components/backbone-deep-model/distribution/deep-model.js'
            'bower_components/rivets/dist/rivets.js'
            'bower_components/allcountries.js/index.js'
          ]
          '<%= vendorFolder %>/css/vendor.css': '<%= compiledFolder %>/*.css'

    stylus:
      all:
        files:
          '<%= distFolder %>/formrenderer.css': '<%= srcFolder %>/styles/base.styl'

    cssmin:
      dist:
        files:
          '<%= distFolder %>/formrenderer-min.css': '<%= distFolder %>/formrenderer.css'

    clean:
      compiled:
        ['<%= compiledFolder %>']

    uglify:
      dist:
        files:
          '<%= distFolder %>/formrenderer-min.js': '<%= distFolder %>/formrenderer.js'

    watch:
      all:
        files: ['<%= srcFolder %>/**/*.{coffee,eco,styl}']
        tasks: 'default'

    # # To test, run `grunt --no-write -v release`
    release:
      options:
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

  grunt.registerTask 'default', ['eco:all', 'coffee:all', 'replace:font_awesome', 'concat:all', 'stylus:all', 'clean:compiled']
  grunt.registerTask 'dist', ['default', 'cssmin:dist', 'uglify:dist']
  grunt.registerTask 'test', ['default', 'karma:main']
  grunt.registerTask 'release', ['default', 'dist', 'test', 'release']
