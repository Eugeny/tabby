import axios from 'axios';

// Mock axios to intercept and inspect calls
jest.mock('axios');
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Inline minimal reproduction of the plugin search logic from pluginManager.service.ts
async function searchPlugins(query: string, keyword: string = 'tabby-plugin') {
  const response = await axios.get(
    `https://registry.npmjs.com/-/v1/search?text=keywords%3A${keyword}%20${query}&size=250`
  );
  return response.data;
}

// Simulated integrity check that MUST exist but is absent in the vulnerable code
function verifyPluginIntegrity(plugin: {
  name: string;
  version: string;
  dist?: { integrity?: string; shasum?: string };
}): boolean {
  // A secure implementation MUST verify integrity before installation
  if (!plugin.dist) return false;
  if (!plugin.dist.integrity && !plugin.dist.shasum) return false;
  // Integrity value must be a valid SRI hash (sha512- or sha1 prefix)
  if (plugin.dist.integrity && !plugin.dist.integrity.match(/^sha(256|512)-[A-Za-z0-9+/=]+$/)) {
    return false;
  }
  return true;
}

// Simulated keyword validation that MUST exist
function isAllowedKeyword(keyword: string): boolean {
  const ALLOWED_KEYWORDS = ['tabby-plugin', 'terminus-plugin'];
  return ALLOWED_KEYWORDS.includes(keyword);
}

// Simulated URL validation that MUST exist
function isRegistryUrlSafe(url: string): boolean {
  try {
    const parsed = new URL(url);
    return (
      parsed.protocol === 'https:' &&
      parsed.hostname === 'registry.npmjs.com' &&
      !parsed.hostname.includes('@') &&
      !url.includes('..') &&
      !url.includes('%0a') &&
      !url.includes('%0d') &&
      !url.includes('\n') &&
      !url.includes('\r')
    );
  } catch {
    return false;
  }
}

describe("Plugin manager maintains security boundary under adversarial input", () => {
  const adversarialQueryPayloads = [
    // URL injection / SSRF attempts
    "evil.com/malicious-package",
    "../../etc/passwd",
    "%0a%0dHost: evil.com",
    "tabby-plugin%0d%0aHost:%20evil.com",
    " OR 1=1",
    "'; DROP TABLE plugins; --",
    "<script>alert(1)</script>",
    "javascript:alert(1)",
    "data:text/html,<script>alert(1)</script>",
    // Keyword injection to expand search scope
    "tabby-plugin malware-package",
    "tabby-plugin keywords:malware",
    "tabby-plugin&text=malware",
    // Path traversal
    "../../../sensitive",
    "..%2F..%2F..%2Fetc%2Fpasswd",
    // Null bytes
    "tabby-plugin\x00malicious",
    // Unicode tricks
    "tabby\u2010plugin",
    "tabby-plugin\u202e",
    // Extremely long input (DoS / buffer overflow attempt)
    "A".repeat(10000),
    // Empty / whitespace
    "",
    "   ",
    "\t\n\r",
  ];

  const adversarialKeywordPayloads = [
    "tabby-plugin OR malware-keyword",
    "tabby-plugin&size=9999",
    "tabby-plugin%20OR%20malware",
    "tabby-plugin\nHost: evil.com",
    "tabby-plugin; rm -rf /",
    "../../evil",
    "tabby-plugin keywords:backdoor",
    "TABBY-PLUGIN",  // case sensitivity check
    "tabby_plugin",  // underscore variant
    "tabby-plugin-evil",
  ];

  const maliciousPluginObjects = [
    // Plugin without any integrity info
    { name: "tabby-evil", version: "1.0.0", dist: {} },
    // Plugin with tampered integrity
    { name: "tabby-evil", version: "1.0.0", dist: { integrity: "sha512-AAAA" } },
    // Plugin with no dist at all
    { name: "tabby-evil", version: "1.0.0" },
    // Plugin with script injection in name
    { name: "<script>alert(1)</script>", version: "1.0.0", dist: { integrity: "sha512-abc123==" } },
    // Plugin with path traversal in name
    { name: "../../etc/passwd", version: "1.0.0", dist: { shasum: "abc123" } },
    // Plugin with valid-looking but fake integrity
    { name: "tabby-backdoor", version: "1.0.0", dist: { integrity: "md5-deadbeef" } },
    // Plugin with empty integrity
    { name: "tabby-empty-integrity", version: "1.0.0", dist: { integrity: "" } },
    // Plugin with null integrity
    { name: "tabby-null-integrity", version: "1.0.0", dist: { integrity: null as unknown as string } },
  ];

  beforeEach(() => {
    jest.clearAllMocks();
    mockedAxios.get.mockResolvedValue({
      data: { objects: [] },
      status: 200,
      statusText: 'OK',
      headers: {},
      config: {} as any,
    });
  });

  // INVARIANT 1: Adversarial query inputs must not cause SSRF or URL injection
  test.each(adversarialQueryPayloads)(
    "query input does not result in unsafe registry URL: %s",
    async (payload) => {
      await searchPlugins(payload).catch(() => {});

      if (mockedAxios.get.mock.calls.length > 0) {
        const calledUrl: string = mockedAxios.get.mock.calls[0][0] as string;

        // The URL must always point to the legitimate NPM registry
        expect(calledUrl).toMatch(/^https:\/\/registry\.npmjs\.com\//);

        // Must not contain CRLF injection sequences
        expect(calledUrl).not.toMatch(/[\r\n]/);
        expect(calledUrl).not.toMatch(/%0[aAdD]/i);

        // Must not redirect to a different host
        const urlAfterHost = calledUrl.replace('https://registry.npmjs.com', '');
        expect(urlAfterHost).not.toMatch(/@/);
        expect(urlAfterHost).not.toMatch(/https?:\/\//);
      }
    }
  );

  // INVARIANT 2: Adversarial keyword inputs must be rejected if not in allowlist
  test.each(adversarialKeywordPayloads)(
    "adversarial keyword is rejected by allowlist: %s",
    (keyword) => {
      const isAllowed = isAllowedKeyword(keyword);
      // None of the adversarial keywords should be in the allowlist
      expect(isAllowed).toBe(false);
    }
  );

  // INVARIANT 3: Plugins without valid integrity MUST NOT pass verification
  test.each(maliciousPluginObjects)(
    "plugin without valid integrity fails verification: %o",
    (plugin) => {
      const result = verifyPluginIntegrity(plugin as any);
      expect(result).toBe(false);
    }
  );

  // INVARIANT 4: Only plugins with valid SRI integrity hashes pass verification
  test("plugin with valid sha512 integrity passes verification", () => {
    const validPlugin = {
      name: "tabby-legitimate-plugin",
      version: "1.0.0",
      dist: {
        integrity: "sha512-abc123XYZvalidBase64PaddedCorrectly==",
        shasum: "da39a3ee5e6b4b0d3255bfef95601890afd80709",
      },
    };
    const result = verifyPluginIntegrity(validPlugin);
    expect(result).toBe(true);
  });

  // INVARIANT 5: Registry URL must always use HTTPS (never HTTP or other protocols)
  test.each([
    "http://registry.npmjs.com/-/v1/search?text=keywords%3Atabby-plugin%20test&size=250",
    "ftp://registry.npmjs.com/-/v1/search?text=keywords%3Atabby-plugin%20test&size=250",
    "//registry.npmjs.com/-/v1/search?text=keywords%3Atabby-plugin%20test&size=250",
    "https://evil.com/-/v1/search?text=keywords%3Atabby-plugin%20test&size=250",
    "https://registry.npmjs.com.evil.com/-/v1/search",
    "https://registry.npmjs.com@evil.com/-/v1/search",
  ])(
    "unsafe registry URL is rejected: %s",
    (url) => {
      expect(isRegistryUrlSafe(url)).toBe(false);
    }
  );

  // INVARIANT 6: Legitimate registry URL must be accepted
  test("legitimate registry URL is accepted", () => {
    const legitimateUrl =
      "https://registry.npmjs.com/-/v1/search?text=keywords%3Atabby-plugin%20test&size=250";
    expect(isRegistryUrlSafe(legitimateUrl)).toBe(true);
  });

  // INVARIANT 7: Search results must be validated before being presented to user
  test("search results containing malicious packages are filtered by integrity check", () => {
    const searchResults = [
      {
        name: "tabby-legitimate",
        version: "1.0.0",
        dist: { integrity: "sha512-validHash==" },
      },
      {
        name: "tabby-malicious",
        version: "1.0.0",
        dist: {},
      },
      {
        name: "tabby-no-dist",
        version: "1.0.0",
      },
      {
        name: "tabby-md5-only",
        version: "1.0.0",
        dist: { integrity: "md5-weakHash" },
      },
    ];

    const verifiedResults = searchResults.filter((plugin) =>
      verifyPluginIntegrity(plugin as any)
    );

    // Only the legitimate plugin with valid integrity should pass
    expect(verifiedResults).toHaveLength(1);
    expect(verifiedResults[0].name).toBe("tabby-legitimate");
  });

  // INVARIANT 8: Query parameters must not allow size manipulation beyond safe limits
  test("search query size parameter cannot be manipulated to exceed safe limit", async () => {
    const MAX_SAFE_SIZE = 250;

    await searchPlugins("test").catch(() => {});

    if (mockedAxios.get.mock.calls.length > 0) {
      const calledUrl: string = mockedAxios.get.mock.calls[0][0] as string;
      const urlObj = new URL(calledUrl);
      const sizeParam = urlObj.searchParams.get("size");

      if (sizeParam !== null) {
        const size = parseInt(sizeParam, 10);
        expect(size).toBeLessThanOrEqual(MAX_SAFE_SIZE);
        expect(size).toBeGreaterThan(0);
      }
    }
  });
});