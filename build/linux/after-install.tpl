#!/bin/bash
cat > '/usr/bin/${executable}' << END
#!/bin/sh
'/opt/${productFilename}/${executable}' --no-sandbox $@
END

chmod +x '/usr/bin/${executable}'
