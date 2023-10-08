import oembed from '../index.js';

import test from 'ava';
import { transform } from '@babel/core';
import { join } from 'path';
import puppeteer from 'puppeteer';
import { compile as mdxCompile } from '@mdx-js/mdx';
import { readFile, writeFile } from 'fs/promises';
import prettier from 'prettier';
import virtual from '@rollup/plugin-virtual';
import { rollup } from 'rollup';
import React from 'react';
import ReactDOM from 'react-dom';
import remark from 'remark';
import remarkHtml from 'remark-html';
import { babel } from '@rollup/plugin-babel';

import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const { CI = 'false' } = process.env;
const FIXTURES = join(__dirname, 'fixtures');
const OUTPUTS = join(__dirname, 'outputs');

const compileJsx = async (src, options) => {
  const config = await prettier.resolveConfig(__filename);

  const prettify = (str) => {
    return prettier.format(str, { ...config, parser: 'html' });
  };

  const jsx = await mdxCompile(src, {
    commonmark: true,
    gfm: true,
    remarkPlugins: [[oembed, options]],
  });

  const { code } = transform(jsx.replace(/^\/\*\s*?@jsx\s*?mdx\s\*\//, ''), {
    sourceType: 'module',
    presets: ['@babel/preset-react'],
  });

  const bundle = await rollup.rollup({
    input: 'main.js',
    treeshake: true,
    plugins: [
      virtual({
        'main.js': "import React from 'react';\n"
          .concat(`const mdx = React.createElement;\n`)
          .concat(code),
      }),
      babel({
        sourceType: 'module',
        presets: ['@babel/preset-react'],
      }),
    ],
  });

  const result = await bundle.generate({
    format: 'iife',
    name: 'Main',
    exports: 'named',
    globals: {
      react: 'React',
    },
  });

  // eslint-disable-next-line no-new-func
  const fn = new Function('React', `${result.output[0].code};\nreturn Main;`);
  const element = React.createElement(fn(React).default);

  return prettify(ReactDOM.renderToStaticMarkup(element));
};

const compile = async (src, options) => {
  const config = await prettier.resolveConfig(__filename);

  const handleResult = (resolve, reject) => {
    return (err, file) => {
      return err
        ? reject(err)
        : resolve(prettier.format(String(file), { ...config, parser: 'html' }));
    };
  };

  return new Promise((resolve, reject) => {
    return remark()
      .use(oembed, options)
      .use(remarkHtml)
      .process(src, handleResult(resolve, reject));
  });
};

const takeScreenshot = async (html, path) => {
  if (JSON.parse(CI)) {
    return;
  }

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.setJavaScriptEnabled(false);
  await page.setContent(html, { waitUntil: 'networkidle2' });
  await page.screenshot({ path, fullPage: true });

  await browser.close();
};

test('defaults > providers', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'providers.md'));
  const output = await compile(markdown);

  await writeFile(join(OUTPUTS, 'defaults-providers.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'defaults-providers.png'));

  t.snapshot(output);
});

test('`syncWidget` > providers', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'providers.md'));
  const output = await compile(markdown, { syncWidget: true });

  await writeFile(join(OUTPUTS, 'sync-widget-providers.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'sync-widget-providers.png'));

  t.snapshot(output);
});

test('`asyncImg` > providers', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'providers.md'));
  const output = await compile(markdown, { asyncImg: true });

  await writeFile(join(OUTPUTS, 'async-img-providers.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'async-img-providers.png'));

  t.snapshot(output);
});

test('defaults > all', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'all.md'));
  const output = await compile(markdown);

  await writeFile(join(OUTPUTS, 'defaults-all.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'defaults-all.png'));

  t.snapshot(output);
});

test('`jsx` > defaults > all', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'all.md'));
  const output = await compileJsx(markdown, { jsx: true });

  await writeFile(join(OUTPUTS, 'jsx-all.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'jsx-all.png'));

  t.snapshot(output);
});

test('`syncWidget` > all', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'all.md'));
  const output = await compile(markdown, { syncWidget: true });

  await writeFile(join(OUTPUTS, 'sync-widget-all.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'sync-widget-all.png'));

  t.snapshot(output);
});

test('`jsx` > `syncWidget` > all', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'all.md'));
  const output = await compileJsx(markdown, { syncWidget: true, jsx: true });

  await writeFile(join(OUTPUTS, 'jsx-sync-widget-all.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'jsx-sync-widget-all.png'));

  t.snapshot(output);
});

test('`asyncImg` > all', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'all.md'));
  const output = await compile(markdown, { asyncImg: true });

  await writeFile(join(OUTPUTS, 'async-img-all.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'async-img-all.png'));

  t.snapshot(output);
});

test('`jsx` > `asyncImg` > all', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'all.md'));
  const output = await compileJsx(markdown, { asyncImg: true, jsx: true });

  await writeFile(join(OUTPUTS, 'jsx-async-img-all.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'jsx-async-img-all.png'));

  t.snapshot(output);
});

test('defaults > html oembed', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'rich-oembed.md'));
  const output = await compile(markdown);

  await writeFile(join(OUTPUTS, 'defaults-rich-oembed.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'defaults-rich-oembed.png'));

  t.snapshot(output);
});

test('`syncWidget` > html oembed', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'rich-oembed.md'));
  const output = await compile(markdown, { syncWidget: true });

  await writeFile(join(OUTPUTS, 'sync-widget-rich-oembed.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'sync-widget-rich-oembed.png'));

  t.snapshot(output);
});

test('`asyncImg` > html oembed', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'rich-oembed.md'));
  const output = await compile(markdown, { asyncImg: true });

  await writeFile(join(OUTPUTS, 'async-img-rich-oembed.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'async-img-rich-oembed.png'));

  t.snapshot(output);
});

test('defaults > photo rich oembed', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'photo-oembed.md'));
  const output = await compile(markdown);

  await writeFile(join(OUTPUTS, 'defaults-photo-oembed.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'defaults-photo-oembed.png'));

  t.snapshot(output);
});

test('`syncWidget` > photo rich oembed', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'photo-oembed.md'));
  const output = await compile(markdown, { syncWidget: true });

  await writeFile(join(OUTPUTS, 'sync-widget-photo-oembed.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'sync-widget-photo-oembed.png'));

  t.snapshot(output);
});

test('`asyncImg` > photo rich oembed', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'photo-oembed.md'));
  const output = await compile(markdown, { asyncImg: true });

  await writeFile(join(OUTPUTS, 'async-img-photo-oembed.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'async-img-photo-oembed.png'));

  t.snapshot(output);
});

test('defaults > photo flat oembed', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'flat-oembed.md'));
  const output = await compile(markdown);

  await writeFile(join(OUTPUTS, 'defaults-flat-oembed.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'defaults-flat-oembed.png'));

  t.snapshot(output);
});

test('`syncWidget` > photo flat oembed', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'flat-oembed.md'));
  const output = await compile(markdown, { syncWidget: true });

  await writeFile(join(OUTPUTS, 'sync-widget-flat-oembed.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'sync-widget-flat-oembed.png'));

  t.snapshot(output);
});

test('`asyncImg` > photo flat oembed', async (t) => {
  const markdown = await readFile(join(FIXTURES, 'flat-oembed.md'));
  const output = await compile(markdown, { asyncImg: true });

  await writeFile(join(OUTPUTS, 'async-img-flat-oembed.html'), output);
  await takeScreenshot(output, join(OUTPUTS, 'async-img-flat-oembed.png'));

  t.snapshot(output);
});
