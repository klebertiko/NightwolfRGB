/**
 * Landing Pages — unit, regression, e2e-structure, mutation.
 *
 * Run: node --test scripts/landing-pages.test.cjs
 */
'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
    inspectLanding,
    landingContractErrors,
    assertLandingContract,
    mutateLanding,
} = require('./landing-pages.cjs');

const ROOT = path.resolve(__dirname, '..');
const LANDING = path.join(ROOT, 'docs', 'index.html');

function readLanding() {
    return fs.readFileSync(LANDING, 'utf8');
}

const FIXTURE_GOOD = `<!doctype html><html><body>
<main>
  <h1>O RGB do PC, no seu controle.</h1>
  <button popovertarget="install">Baixar</button>
  <button popovertarget="install">Baixar</button>
</main>
<div id="install" popover="auto"></div>
<footer class="site-foot">
  <p>Nightwolf RGB</p>
  <p><span>MIT</span> · <a href="https://openrgb.org/">OpenRGB</a> ·
  <a href="https://github.com/klebertiko/NightwolfRGB">GitHub</a></p>
</footer>
</body></html>`;

/* ── unit ── */

test('unit: good fixture passes contract', () => {
    assert.doesNotThrow(() => assertLandingContract(FIXTURE_GOOD));
    const i = inspectLanding(FIXTURE_GOOD);
    assert.equal(i.heroTaglineCount, 1);
    assert.equal(i.hasInvolvedSection, false);
    assert.equal(i.footerEchoesHero, false);
    assert.equal(i.footerHasBrand, true);
});

test('unit: involved section is a contract error', () => {
    const bad = FIXTURE_GOOD.replace(
        '</main>',
        '<section class="involved"><h2 id="involved-title">x</h2></section></main>',
    );
    const errors = landingContractErrors(bad);
    assert.ok(errors.some((e) => /involved section/i.test(e)));
});

test('unit: hero echo in footer is a contract error', () => {
    const bad = FIXTURE_GOOD.replace(
        /<footer[\s\S]*<\/footer>/,
        '<footer class="foot-stmt"><p class="foot-stmt__line">O RGB do PC, no seu controle.</p></footer>',
    );
    const errors = landingContractErrors(bad);
    assert.ok(errors.some((e) => /hero tagline/i.test(e)));
});

/* ── regression (shipped HTML) ── */

test('regression: docs/index.html satisfies landing contract', () => {
    assert.doesNotThrow(() => assertLandingContract(readLanding()));
});

test('regression: no Código aberto / Fork pitch section', () => {
    const html = readLanding();
    assert.equal(/Código aberto\. Fork à vontade\./.test(html), false);
    assert.equal(/id=["']involved-title["']/.test(html), false);
});

/* ── e2e-structure (document order / seams) ── */

test('e2e: main closes then install sheet then footer — no involved between', () => {
    const html = readLanding();
    const mainClose = html.lastIndexOf('</main>');
    const install = html.indexOf('id="install"');
    const footer = html.indexOf('<footer');
    assert.ok(mainClose > 0);
    assert.ok(install > mainClose, 'install sheet follows main');
    assert.ok(footer > install, 'footer follows install sheet');
    const between = html.slice(mainClose, footer);
    assert.equal(/\binvolved\b/.test(between), false);
});

test('e2e: footer is a thin site-foot, not a second hero', () => {
    const html = readLanding();
    const i = inspectLanding(html);
    assert.ok(/site-foot/.test(i.footerHtml), 'footer uses site-foot class');
    assert.equal(i.footerUsesStatementDisplay, false);
    assert.equal(i.footerEchoesHero, false);
    assert.match(i.footerHtml, /Nightwolf RGB/);
    assert.match(i.footerHtml, /\bMIT\b/);
});

test('e2e: Baixar still opens install popover (mast + hero)', () => {
    const html = readLanding();
    const i = inspectLanding(html);
    assert.ok(i.installSheetPresent);
    assert.ok(i.baixarOpensInstall >= 2);
});

/* ── mutation (kill score) ── */

test('mutation: readd-involved is killed by contract', () => {
    const mutant = mutateLanding(FIXTURE_GOOD, 'readd-involved');
    const errors = landingContractErrors(mutant);
    assert.ok(errors.length >= 1);
    assert.ok(errors.some((e) => /involved/i.test(e)));
});

test('mutation: hero-echo-footer is killed by contract', () => {
    const mutant = mutateLanding(FIXTURE_GOOD, 'hero-echo-footer');
    const errors = landingContractErrors(mutant);
    assert.ok(errors.some((e) => /hero tagline|statement display/i.test(e)));
});

test('mutation: drop-mit is killed by contract', () => {
    const mutant = mutateLanding(FIXTURE_GOOD, 'drop-mit');
    const errors = landingContractErrors(mutant);
    assert.ok(errors.some((e) => /MIT/i.test(e)));
});

test('mutation: windows-lock is killed by contract', () => {
    const mutant = mutateLanding(FIXTURE_GOOD, 'windows-lock');
    const errors = landingContractErrors(mutant);
    assert.ok(errors.some((e) => /Windows/i.test(e)));
});

test('mutation: shipping HTML mutants stay red against live file', () => {
    const live = readLanding();
    // If live is already good, mutating it must still fail.
    for (const name of ['readd-involved', 'hero-echo-footer', 'drop-mit', 'windows-lock']) {
        const errors = landingContractErrors(mutateLanding(live, name));
        assert.ok(errors.length > 0, `live mutant ${name} must fail`);
    }
});
