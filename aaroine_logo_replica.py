import matplotlib.pyplot as plt
import matplotlib.patches as patches
import matplotlib.path as mpath

fig, ax = plt.subplots(figsize=(6, 6), facecolor='white')

# Define coordinates for the main 'A' body
path_data = [
    (mpath.Path.MOVETO, [250, 420]),
    (mpath.Path.CURVE4, [280, 420]),
    (mpath.Path.CURVE4, [400, 180]),
    (mpath.Path.CURVE4, [370, 100]),
    (mpath.Path.CURVE4, [320, 90]),
    (mpath.Path.CURVE4, [250, 90]),
    (mpath.Path.CURVE4, [180, 90]),
    (mpath.Path.CURVE4, [130, 100]),
    (mpath.Path.CURVE4, [100, 180]),
    (mpath.Path.CURVE4, [220, 420]),
    (mpath.Path.CLOSEPOLY, [250, 420]),
]

codes, verts = zip(*path_data)
path = mpath.Path(verts, codes)

# Add the main shape with royal blue base color
patch = patches.PathPatch(path, facecolor='#0055FF', edgecolor='none', lw=0)
ax.add_patch(patch)

# Inner Cutout Triangle
inner_path = mpath.Path([[250, 280], [190, 160], [270, 160], [250, 280]])
inner_patch = patches.PathPatch(inner_path, facecolor='white', edgecolor='none')
ax.add_patch(inner_patch)

# Draw Text
ax.text(250, -50, "Aaroine", fontsize=45, weight='bold', color='#030F26', 
        ha='center', va='center', fontname='sans-serif')

# Adjust layout boundaries
ax.set_xlim(0, 500)
ax.set_ylim(-100, 500)
ax.axis('off')

# Save output
plt.savefig('aaroine_logo_replica.png', dpi=300, bbox_inches='tight', facecolor='white')
plt.show()
<img src="/assets/images/logo.png" className="w-5 h-5" />
<span>Aaroine</span>