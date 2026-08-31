function cleanS3Url(rawUrl) {
  if (!rawUrl || typeof rawUrl !== "string") return "";
  let url = rawUrl.trim();

  // 1. Un-nest double protocols
  const nestedHttpsIdx = url.indexOf("https://", 8);
  const nestedHttpIdx = url.indexOf("http://", 7);
  if (nestedHttpsIdx !== -1) {
    url = url.substring(nestedHttpsIdx);
  } else if (nestedHttpIdx !== -1) {
    url = url.substring(nestedHttpIdx);
  }

  // 2. Remove predefined domain / leading path before known S3 hostnames
  const s3DomainRegex = /(?:https?:\/\/[^\/]+\/|\/+)(s3[a-z0-9\-\.]*\.ionoscloud\.com\/.*|a-health-place\.s3[a-z0-9\-\.]*\.ionoscloud\.com\/.*|[a-z0-9\-\.]+\.s3[a-z0-9\-\.]*\.amazonaws\.com\/.*|s3[a-z0-9\-\.]*\.amazonaws\.com\/.*|[a-z0-9\-\.]+\.backblazeb2\.com\/.*|[a-z0-9\-\.]+\.digitaloceanspaces\.com\/.*|storage\.googleapis\.com\/.*)/i;
  const s3Match = url.match(s3DomainRegex);
  if (s3Match && s3Match[1]) {
    url = `https://${s3Match[1]}`;
  }

  // 3. If string starts with an S3 domain without protocol
  if (/^(?:s3[a-z0-9\-\.]*\.ionoscloud\.com|a-health-place\.s3[a-z0-9\-\.]*\.ionoscloud\.com|[a-z0-9\-\.]+\.s3[a-z0-9\-\.]*\.amazonaws\.com|s3[a-z0-9\-\.]*\.amazonaws\.com|[a-z0-9\-\.]+\.backblazeb2\.com|[a-z0-9\-\.]+\.digitaloceanspaces\.com|storage\.googleapis\.com)/i.test(url)) {
    url = `https://${url.replace(/^\/+/, "")}`;
  }

  // 4. Protocol-relative URLs
  if (url.startsWith("//")) {
    url = `https:${url}`;
  }

  return url;
}

const testCases = [
  "https://ahealthplace.com/s3-eu-central-2.ionoscloud.com/a-health-place/site-AHP/1786966897149-wy80izh.webp",
  "https://ahealthplace.com/a-health-place.s3-eu-central-2.ionoscloud.com/site-AHP/1786953515287-dilfi1l.webp",
  "http://localhost:3000/s3-eu-central-2.ionoscloud.com/a-health-place/site-AHP/1786966897149-wy80izh.webp",
  "http://209.46.127.71/s3-eu-central-2.ionoscloud.com/a-health-place/site-AHP/1786966897149-wy80izh.webp",
  "https://ahealthplace.com/https://s3-eu-central-2.ionoscloud.com/a-health-place/site-AHP/1786966897149-wy80izh.webp",
  "/s3-eu-central-2.ionoscloud.com/a-health-place/site-AHP/1786966897149-wy80izh.webp",
  "s3-eu-central-2.ionoscloud.com/a-health-place/site-AHP/1786966897149-wy80izh.webp",
  "//s3-eu-central-2.ionoscloud.com/a-health-place/site-AHP/1786966897149-wy80izh.webp",
  "https://s3-eu-central-2.ionoscloud.com/a-health-place/site-AHP/1786966897149-wy80izh.webp",
  "/images/Logo-web.png",
  "https://res.cloudinary.com/demo/image/upload/sample.jpg"
];

for (const tc of testCases) {
  console.log("Input: ", tc);
  console.log("Output:", cleanS3Url(tc));
  console.log("---");
}


