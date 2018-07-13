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
        }));
});

gulp.task('build', ['build-umd', 'build-cjs-es', 'test']);

gulp.task('watch', () => {
    clear();
    return gulp.watch(['src/**/*', 'test/**/*'], ['build']);
});