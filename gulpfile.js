/*jslint node: true, for */

var gulp = require('gulp'),
    babel = require('gulp-babel'),
    del = require('del'),
    sass = require('gulp-sass'),
    sassLinter = require('gulp-sass-lint'),
    cssCompressor = require('gulp-csso'),
    browserSpecificPrefixer = require('gulp-autoprefixer'),
    htmlMinifier = require('gulp-htmlmin'),
    htmlValidator = require('gulp-html'),
    jsLinter = require('gulp-eslint'),
    jsCompressor = require('gulp-uglify'),
    imageCompressor = require('gulp-imagemin'),
    tempCache = require('gulp-cache'),
    browserSync = require('browser-sync'),
    config = require('./config.json'),
    colors = config.colors,
    reload = browserSync.reload,
    browserChoice = 'default';

gulp.task('safari', function () {
    'use strict';

    browserChoice = 'safari';
});

gulp.task('firefox', function () {
    'use strict';

    browserChoice = 'firefox';
});

gulp.task('chrome', function () {
    'use strict';

    browserChoice = 'google chrome';
});

gulp.task('opera', function () {
    'use strict';

    browserChoice = 'opera';
});

gulp.task('edge', function () {
    'use strict';

    browserChoice = 'microsoft-edge';
});

gulp.task('allBrowsers', function () {
    'use strict';

    browserChoice = ['safari', 'firefox', 'google chrome', 'opera', 'microsoft-edge'];
});

gulp.task('validateHTML', function () {
    'use strict';

    return gulp.src(['dev/html/*.html', 'dev/html/**/*.html'])
        .pipe(htmlValidator());
});

gulp.task('compressHTML', function () {
    'use strict';

    return gulp.src(['dev/html/*.html', 'dev/html/**/*.html'])
        .pipe(htmlMinifier({
            removeComments: true,
            collapseWhitespace: true
        }))
        .pipe(gulp.dest('./'));
});

gulp.task('lintSass', function () {
    'use strict';

    return gulp.src('dev/styles/main.scss')
        .pipe(sassLinter({
            configFile: './.sass-lint.yml'
        }))
        .pipe(sassLinter.format())
        .pipe(sassLinter.failOnError());

});

gulp.task('compileCSSForDev', function () {
    'use strict';

    return gulp.src('dev/styles/main.scss')
        .pipe(sass({
            outputStyle: 'expanded',
            precision: 10
        }).on('error', sass.logError))
        .pipe(browserSpecificPrefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(gulp.dest('temp/styles'));
});

gulp.task('compileCSSForProd', function () {
    'use strict';

    return gulp.src('dev/styles/main.scss')
        .pipe(sass({
            outputStyle: 'compressed',
            precision: 10
        }).on('error', sass.logError))
        .pipe(browserSpecificPrefixer({
            browsers: ['last 2 versions']
        }))
        .pipe(cssCompressor())
        .pipe(gulp.dest('./styles'));
});

gulp.task('compileJSForDev', function () {
    'use strict';

    return gulp.src('dev/scripts/*.js')
        .pipe(babel())
        .pipe(gulp.dest('temp/scripts'));
});

gulp.task('compileJSForProd', function () {
    'use strict';

    return gulp.src('dev/scripts/*.js')
        .pipe(babel())
        .pipe(jsCompressor())
        .pipe(gulp.dest('./scripts'));
});

gulp.task('lintJS', function () {
    'use strict';

    return gulp.src('dev/scripts/*.js')
        .pipe(babel())
        .pipe(jsLinter({
            rules: {
                indent: [2, 4, {SwitchCase: 1}],
                quotes: [2, 'single'],
                semi: [2, 'always'],
                'linebreak-style': [2, 'unix'],
                'max-len': [2, 85, 4]
            },
            env: {
                node: true,
                browser: true
            },
            extends: 'eslint:recommended'
        }))
        .pipe(jsLinter.formatEach('compact', process.stderr))
        //
        // “To have the process exit with an error code (1) on lint error, return
        // the stream and pipe to failAfterError last.”
        //
        //     — https://github.com/adametry/gulp-eslint
        //
        .pipe(jsLinter.failAfterError());
});

gulp.task('compressThenCopyImagesToProdFolder', function () {
    'use strict';

    return gulp.src('dev/img/**/*')
        .pipe(tempCache(
            imageCompressor({
                optimizationLevel: 3, // For PNG files. Accepts 0 – 7; 3 is default.
                progressive: true,    // For JPG files.
                multipass: false,     // For SVG files. Set to true for compression.
                interlaced: false     // For GIF files. Set to true for compression.
            })
        ))
        .pipe(gulp.dest('./img'));
});

gulp.task('copyUnprocessedAssetsToProdFolder', function () {
    'use strict';

    return gulp.src([
        'dev/*.*',       // Source all files,
        'dev/**',        // and all folders,
        '!dev/html/',    // but not the HTML folder
        '!dev/html/*.*', // or any files in it
        '!dev/html/**',  // or any sub folders
        '!dev/img/',     // ignore images;
        '!dev/**/*.js',  // ignore JS;
        '!dev/styles/**' // ignore Sass/CSS.
    ], {dot: true}).pipe(gulp.dest('./'));
});

gulp.task('build', [
    'validateHTML',
    'compressHTML',
    'lintSass',
    'compileCSSForProd',
    'lintJS',
    'compileJSForProd',
    'compressThenCopyImagesToProdFolder',
    'copyUnprocessedAssetsToProdFolder'
]);

gulp.task('serve', ['compileCSSForDev', 'lintSass', 'compileJSForDev', 'lintJS', 'validateHTML'], function () {
    'use strict';

    browserSync({
        notify: true,
        port: 9000,
        reloadDelay: 100,
        browser: browserChoice,
        server: {
            baseDir: [
                'temp',
                'dev',
                'dev/html'
            ]
        }
    });

    gulp.watch('dev/scripts/*.js', ['compileJSForDev', 'lintJS'])
        .on('change', reload);

    gulp.watch('dev/styles/**/*.scss', ['compileCSSForDev'])
        .on('change', reload);

    gulp.watch(['dev/html/**/*.html'], ['validateHTML'])
        .on('change', reload);

    gulp.watch('dev/img/**/*')
        .on('change', reload);
});

gulp.task('clean', function () {
    'use strict';

    var fs = require('fs'),
        i,
        expendableFolders = ['temp'];

    for (i = 0; i < expendableFolders.length; i += 1) {
        try {
            fs.accessSync(expendableFolders[i], fs.F_OK);
            process.stdout.write('\n\tThe ' + colors.green + expendableFolders[i] +
                    colors.default + ' directory was found and ' + colors.green +
                    'will' + colors.default + ' be deleted.\n');
            del(expendableFolders[i]);
        } catch (error) {
            if (error) {
                process.stdout.write('\n\tThe ' + colors.red +
                        expendableFolders[i] + colors.default +
                        ' directory does ' + colors.red + 'not' + colors.default +
                        ' exist or is ' + colors.red + 'not' + colors.default +
                        ' accessible.\n');
            }
        }
    }

    process.stdout.write('\n');
});

gulp.task('default', function () {
    'use strict';

    var exec = require('child_process').exec;

    exec('gulp --tasks', function (error, stdout, stderr) {
        if (null !== error) {
            process.stdout.write('An error was likely generated when invoking ' +
                    'the `exec` program in the default task.');
        }

        if ('' !== stderr) {
            process.stdout.write('Content has been written to the stderr stream ' +
                    'when invoking the `exec` program in the default task.');
        }

        process.stdout.write('\n\tThis default task does ' + colors.red +
                'nothing' + colors.default + ' but generate this message. The ' +
                'available tasks are:\n\n' + stdout);
    });
});
