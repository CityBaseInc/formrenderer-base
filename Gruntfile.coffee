module.exports = (grunt) ->
  grunt.loadNpmTasks('grunt-contrib-coffee')
  grunt.loadNpmTasks('grunt-contrib-concat')
  grunt.loadNpmTasks('grunt-contrib-cssmin')
  grunt.loadNpmTasks('grunt-eco')
  grunt.loadNpmTasks('grunt-contrib-sass')
  grunt.loadNpmTasks('grunt-contrib-uglify')
  grunt.loadNpmTasks('grunt-contrib-watch')
  grunt.loadNpmTasks('grunt-contrib-clean')
  grunt.loadNpmTasks('grunt-karma')
  grunt.loadNpmTasks('grunt-aws')

  grunt.initConfig
    aws: if grunt.file.exists("credentials.json") then grunt.file.readJSON("credentials.json") else {}
    version: grunt.file.read("src/version.coffee").match(/\'([0-9\.]+)\'\s/)[1]
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
      config:
        options:
          bare: true
        files:
          '<%= compiledFolder %>/vendor_config.js': [
            '<%= srcFolder %>/vendor_config.coffee'
          ]
      all:
        files:
          '<%= compiledFolder %>/scripts.js': [
            '<%= srcFolder %>/main.coffee'
            '<%= srcFolder %>/version.coffee'
            '<%= srcFolder %>/data.coffee'
            '<%= srcFolder %>/condition_checker.coffee'
            '<%= srcFolder %>/validators/*.coffee'
            '<%= srcFolder %>/models.coffee'
            '<%= srcFolder %>/plugins/base.coffee'
            '<%= srcFolder %>/plugins/default/*.coffee'
            '<%= srcFolder %>/views/*.coffee'
          ]
      extras:
        expand: true
        flatten: true
        src: ['<%= srcFolder %>/plugins/extra/*.coffee']
        dest: '<%= distFolder %>/plugins'
        ext: '.js'

    concat:
      all:
        files:
          '<%= compiledFolder %>/vendor.js': [
            'bower_components/jquery-form/jquery.form.js'
            'bower_components/store.js/store.js'
            'bower_components/underscore/underscore.js'
            'bower_components/backbone/backbone.js'
            'bower_components/underscore.string/dist/underscore.string.min.js'
            'bower_components/beforeunload.js/index.js'
            'bower_components/ajb-sanitize/lib/sanitize.js'
            'bower_components/ajb-sanitize/lib/sanitize/config/relaxed.js'
            'bower_components/backbone-deep-model/distribution/deep-model.js'
            'bower_components/rivets-dobt/dist/rivets.js'
            'bower_components/iso-country-names/index.js'
            'bower_components/require_once/require_once.js'
          ]
          '<%= compiledFolder %>/formrenderer.js': [
            '<%= compiledFolder %>/vendor_config.js'
            '<%= compiledFolder %>/scripts.js'
            '<%= distFolder %>/i18n/en.js' # load english by default
            '<%= compiledFolder %>/templates.js'
          ]
      dist:
        files:
          '<%= distFolder %>/formrenderer.standalone.uncompressed.js': [
            '<%= compiledFolder %>/formrenderer.js'
          ]
          '<%= distFolder %>/formrenderer.uncompressed.js': [
            '<%= compiledFolder %>/vendor.js'
            '<%= compiledFolder %>/formrenderer.js'
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
          '<%= distFolder %>/formrenderer.uncompressed.css': '<%= distFolder %>/styles/main.scss'
          '<%= distFolder %>/formrenderer.with_extras.uncompressed.css': '<%= distFolder %>/styles/with_extras.scss'

    cssmin:
      dist:
        files:
          '<%= distFolder %>/formrenderer.css': '<%= distFolder %>/formrenderer.uncompressed.css'
          '<%= distFolder %>/formrenderer.with_extras.css': '<%= distFolder %>/formrenderer.with_extras.uncompressed.css'

    clean:
      compiled:
        ['<%= compiledFolder %>']

    uglify:
      dist:
        files:
          '<%= distFolder %>/formrenderer.standalone.js': '<%= distFolder %>/formrenderer.standalone.uncompressed.js'
          '<%= distFolder %>/formrenderer.js': '<%= distFolder %>/formrenderer.uncompressed.js'

    watch:
      build:
        files: [
          '<%= srcFolder %>/**/*.{coffee,eco}',
          '<%= distFolder %>/styles/**/*.scss',
          '<%= testFolder %>/support/fixtures/*.js',
          'fixtures/*.json'
        ]
        tasks: 'default'
      test:
        files: ['<%= testFolder %>/**/*_test.{coffee,js}']
        tasks: 'test'

    s3:
      options:
        accessKeyId: "<%= aws.accessKeyId %>"
        secretAccessKey: "<%= aws.secretAccessKey %>"
        bucket: 'formrenderer-base'
        access: 'public-read'
        gzip: true
      version:
        cwd: "dist/"
        src: "**"
        dest: '<%= version %>/'
      autoupdate:
        files: [
          src: 'dist/formrenderer.css'
          dest: '0/formrenderer.css'
        ,
          src: 'dist/formrenderer.js'
          dest: '0/formrenderer.js'
        ]
        options:
          headers:
            CacheControl: 600 # 10 minutes

    karma:
      main:
        options:
          configFile: '<%= testFolder %>/karma.conf.coffee'
          singleRun: true
          reporters: 'dots'


  grunt.registerTask 'convertI18nToJs', '', ->
    files = grunt.file.expand('src/i18n/*.yml')

    for file in files
      language = file.match(/\/([a-z]+)\.yml/)[1]
      grunt.file.write(
        "dist/i18n/#{language}.js",
        "var FormRenderer#{language.toUpperCase()} = #{JSON.stringify(grunt.file.readYAML(file)[language])};\n" +
        "if (typeof FormRenderer !== 'undefined') FormRenderer.t = FormRenderer#{language.toUpperCase()};"
      )

  grunt.registerTask 'convertJsonFixtures', '', ->
    grunt.file.write(
      'test/fixtures/converted.js',
      "Fixtures.Validation = #{grunt.file.read('fixtures/validation.json')};" +
      "Fixtures.Conditional = #{grunt.file.read('fixtures/conditional.json')};"
    )

  grunt.registerTask 'default', ['convertI18nToJs', 'convertJsonFixtures', 'eco:all',
                                 'coffee:config', 'coffee:all', 'coffee:extras', 'concat:all',
                                 'concat:dist', 'sass:all', 'clean:compiled']
  grunt.registerTask 'dist', ['cssmin:dist', 'uglify:dist']
  grunt.registerTask 'all', ['default', 'dist']
  grunt.registerTask 'test', ['karma:main']
