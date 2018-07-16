const rollup = require('rollup');
const resolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const uglify = require('rollup-plugin-uglify-es');
const babel = require('rollup-plugin-babel');
const replace = require('rollup-plugin-replace');
const sourcemaps = require('rollup-plugin-sourcemaps');
const builtin = require('rollup-plugin-node-builtins');
const pkg = require('./package.json');
const gulp = require('gulp');
const mocha = require('gulp-mocha');
const clear = require('clear');
const vinylPaths = require('vinyl-paths');
const del = require('del');

var child_exec = require('child_process').exec;

const srcPaths = ['./src/**/*.js']

gulp.task('build-umd', () => {
    return rollup.rollup({
        input: 'src/main.js',
        plugins: [
            builtin(),
            sourcemaps(),
            resolve(),
            commonjs(),
            babel({
                exclude: 'node_modules/**' // only transpile our source code
            }),
            replace({
                ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
            }),
            (process.env.NODE_ENV === 'production' && uglify())
        ]
    }).then(bundle => {
        return bundle.write({
            name: 'js-data-frappe',
            file: pkg.browser,
            format: 'umd',
            sourcemap: true
        });
    });
});

gulp.task('build-cjs-es', () => {
    return rollup.rollup({
        input: 'src/main.js',
        external: ['js-data-http'],
        plugins: [
            sourcemaps(),
            resolve(),
            replace({
                ENV: JSON.stringify(process.env.NODE_ENV || 'development'),
            }),
            (process.env.NODE_ENV === 'production' && uglify())
        ]
    }).then(bundle => {
        return bundle.write({
            name: 'js-data-frappe',
            file: pkg.main, 
            format: 'cjs',
            sourcemap: true
        }).then(() => {
            return bundle.write({
                name: 'js-data-frappe',
                file: pkg.module,
                format: 'es',
                sourcemap: true
            });
        });
    })
});

gulp.task('test', ['build-umd', 'build-cjs-es'], () => {
    return gulp.src('./test/**/*.test.js', { read: false })
        .pipe(mocha({ 
            reporter: 'list' 
        }))
});

gulp.task('docs', ['build'], function (done) {
    let docPath = `./docs/${pkg.name}/${pkg.version}`;
    function moveDocs() {
        gulp.src(`${docPath}/**/*`, { base: docPath })
            .pipe(gulp.dest('./docs')).on('end', () => { cleanDocs(done) });
    }
    function cleanDocs(done) {
        gulp.src(`./docs/${pkg.name}`, { base: './', read: false })
            .pipe(vinylPaths(del)).on('finish', () => { done() });
    }
    child_exec('node ./node_modules/jsdoc/jsdoc.js -c ./jsdoc.json', undefined, moveDocs);
})

gulp.task('build', ['build-umd', 'build-cjs-es', 'test']);

gulp.task('watch', () => {
    clear();
    return gulp.watch(['src/**/*', 'test/**/*'], ['build']);
});

gulp.task('watch:docs', () => {
    clear();
    return gulp.watch(['src/**/*', 'test/**/*', 'README.md'], ['docs']);
});