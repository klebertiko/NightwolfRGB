/**
 * Landing Pages contract — inspect docs/index.html without a browser.
 * Used by unit, regression, e2e-structure, and mutation tests.
 */
'use strict';

/**
 * @param {string} html
 * @returns {{
 *   heroTaglineCount: number,
 *   hasInvolvedSection: boolean,
 *   hasInvolvedCss: boolean,
 *   footerHtml: string,
 *   footerEchoesHero: boolean,
 *   footerHasBrand: boolean,
 *   footerHasMit: boolean,
 *   footerHasOpenRgb: boolean,
 *   footerHasGithub: boolean,
 *   footerWindowsOnly: boolean,
 *   footerUsesStatementDisplay: boolean,
 *   installSheetPresent: boolean,
 *   baixarOpensInstall: number,
 *   cloneDevCommandsInPage: boolean,
 * }}
 */
function inspectLanding(html) {
    const footerMatch = html.match(/<footer\b[^>]*>([\s\S]*?)<\/footer>/i);
    const footerHtml = footerMatch ? footerMatch[0] : '';
    const tagline = /O RGB do PC, no seu controle\./g;

    return {
        heroTaglineCount: (html.match(tagline) || []).length,
        hasInvolvedSection:
            /<section\b[^>]*\binvolved\b/.test(html) || /id=["']involved-title["']/.test(html),
        hasInvolvedCss: /\.involved\b/.test(html) || /\.involved-mark\b/.test(html),
        footerHtml,
        footerEchoesHero: /O RGB do PC, no seu controle\./.test(footerHtml),
        footerHasBrand: /Nightwolf RGB/.test(footerHtml),
        footerHasMit: /\bMIT\b/.test(footerHtml),
        footerHasOpenRgb: /openrgb\.org/i.test(footerHtml),
        footerHasGithub: /github\.com\/klebertiko\/NightwolfRGB/.test(footerHtml),
        footerWindowsOnly: /Windows-only|s[oó] Windows|apenas Windows/i.test(footerHtml),
        footerUsesStatementDisplay:
            /class=["'][^"']*foot-stmt__line/.test(footerHtml) ||
            /foot-stmt__line/.test(footerHtml),
        installSheetPresent: /id=["']install["']/.test(html) && /popover=["']auto["']/.test(html),
        baixarOpensInstall: (html.match(/popovertarget=["']install["']/g) || []).length,
        cloneDevCommandsInPage: /npm run desktop/.test(html),
    };
}

/**
 * @param {string} html
 * @returns {string[]}
 */
function landingContractErrors(html) {
    const i = inspectLanding(html);
    const errors = [];

    if (i.hasInvolvedSection) {
        errors.push('pre-footer involved section must be removed (duplicates CTA/source pitch)');
    }
    if (i.hasInvolvedCss) {
        errors.push('involved CSS must be removed with the section');
    }
    if (i.cloneDevCommandsInPage) {
        errors.push('clone/dev npm commands belong in docs, not the marketing landing');
    }
    if (i.footerEchoesHero) {
        errors.push('footer must not repeat the hero tagline');
    }
    if (i.footerUsesStatementDisplay) {
        errors.push('footer must not use the large Ft5 statement display line');
    }
    if (i.heroTaglineCount !== 1) {
        errors.push(`hero tagline must appear exactly once (got ${i.heroTaglineCount})`);
    }
    if (!i.footerHasBrand) errors.push('footer must name Nightwolf RGB');
    if (!i.footerHasMit) errors.push('footer must include MIT');
    if (!i.footerHasOpenRgb) errors.push('footer must link OpenRGB');
    if (!i.footerHasGithub) errors.push('footer must link the GitHub repo');
    if (i.footerWindowsOnly) errors.push('footer must not lock the product to Windows');
    if (!i.installSheetPresent) errors.push('install sheet popover must remain');
    if (i.baixarOpensInstall < 2) {
        errors.push('Baixar must open the install sheet from mast and hero');
    }

    return errors;
}

/**
 * @param {string} html
 */
function assertLandingContract(html) {
    const errors = landingContractErrors(html);
    if (errors.length) {
        const err = new Error(errors.join('\n'));
        err.errors = errors;
        throw err;
    }
    return inspectLanding(html);
}

/**
 * Apply a named mutation for kill-score checks.
 * @param {string} html
 * @param {'readd-involved'|'hero-echo-footer'|'drop-mit'|'windows-lock'} name
 */
function mutateLanding(html, name) {
    switch (name) {
        case 'readd-involved':
            return html.replace(
                '</main>',
                `<section class="involved reveal" aria-labelledby="involved-title">
        <div class="wrap">
          <h2 id="involved-title">Código aberto. Fork à vontade.</h2>
          <pre><code>npm run desktop</code></pre>
        </div>
      </section>
  </main>`,
            );
        case 'hero-echo-footer':
            return html.replace(
                /<footer\b[^>]*>[\s\S]*?<\/footer>/i,
                `<footer class="foot-stmt">
    <div class="wrap">
      <p class="foot-stmt__line">O RGB do PC, no seu controle.</p>
      <div class="foot-stmt__meta">
        <span>MIT · motor <a href="https://openrgb.org/">OpenRGB</a></span>
        <a href="https://github.com/klebertiko/NightwolfRGB">GitHub</a>
      </div>
    </div>
  </footer>`,
            );
        case 'drop-mit':
            return html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/i, (block) =>
                block.replace(/\bMIT\b/g, 'Proprietary'),
            );
        case 'windows-lock':
            return html.replace(/<footer\b[^>]*>[\s\S]*?<\/footer>/i, (block) =>
                block.replace(
                    /<\/footer>/i,
                    `<span>Windows-only</span></footer>`,
                ),
            );
        default:
            throw new Error(`unknown mutation: ${name}`);
    }
}

module.exports = {
    inspectLanding,
    landingContractErrors,
    assertLandingContract,
    mutateLanding,
};
