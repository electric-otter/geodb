async function checkIPAgainstGeoDB() {
  try {
    // Get public IP securely
    const ipResponse = await fetch('https://api.ipify.org?format=json', {
      mode: 'cors',
      credentials: 'omit'
    });
    
    if (!ipResponse.ok) throw new Error('IP fetch failed');
    const { ip } = await ipResponse.json();

    // Load GeoDB with security headers
    const geodbResponse = await fetch('./geodb.txt', {
      headers: new Headers({
        'Content-Type': 'text/plain',
        'X-Content-Type-Options': 'nosniff'
      })
    });
    
    if (!geodbResponse.ok) throw new Error('GeoDB load failed');
    const geodbText = await geodbResponse.text();

    // Parse and lookup IP (basic implementation)
    const entries = geodbText.trim().split('\n');
    for (const entry of entries) {
      if (!entry.trim()) continue;
      const [cidr, ...data] = entry.split(',');
      if (cidr.includes('/')) {
        const [range, mask] = cidr.split('/');
        if (isIPInSubnet(ip, range, mask)) {
          console.log('IP Match:', { ip, cidr, data });
          return { ip, cidr, data };
        }
      } else if (ip === cidr) {
        console.log('Exact IP Match:', { ip, data });
        return { ip, data };
      }
    }
    
    console.log('IP not found in GeoDB');
    return null;

  } catch (error) {
    console.error('Security Error:', error);
    return null;
  }
}

// Helper function to check IP against subnet
function isIPInSubnet(ip, subnet, mask) {
  const ipParts = ip.split('.').map(Number);
  const subnetParts = subnet.split('.').map(Number);
  let maskBits = parseInt(mask, 10);

  for (let i = 0; i < 4; i++) {
    let maskByte = 0;
    if (maskBits >= 8) {
      maskByte = 255;
      maskBits -= 8;
    } else if (maskBits > 0) {
      maskByte = ~(255 >> maskBits) & 255;
      maskBits = 0;
    }
    if ((ipParts[i] & maskByte) !== (subnetParts[i] & maskByte)) {
      return false;
    }
  }
  return true;
}

// Run securely
checkIPAgainstGeoDB();
