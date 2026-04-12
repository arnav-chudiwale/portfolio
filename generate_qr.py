import qrcode
from qrcode.image.styledpil import StyledPilImage
from qrcode.image.styles.moduledrawers import RoundedModuleDrawer
from PIL import Image

URL = "https://portfolio-pi-indol-72.vercel.app/"
NAVY = "#0A1628"
GOLD = "#C8A951"

# High error correction so it stays scannable
qr = qrcode.QRCode(
    version=1,
    error_correction=qrcode.constants.ERROR_CORRECT_H,
    box_size=20,
    border=4,
)
qr.add_data(URL)
qr.make(fit=True)

# Navy modules on white background with rounded corners
img = qr.make_image(
    image_factory=StyledPilImage,
    module_drawer=RoundedModuleDrawer(),
    fill_color=NAVY,
    back_color="white",
)

img.save("public/qr-code.png")
print("QR code saved to public/qr-code.png")
