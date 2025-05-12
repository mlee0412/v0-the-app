-- Add new roles to the roles table
INSERT INTO roles (name, description)
VALUES 
  ('controller', 'Controller - Full system access'),
  ('manager', 'Manager - Manage operations and staff'),
  ('server', 'Server - Handle table service'),
  ('bartender', 'Bartender - Handle bar operations'),
  ('barback', 'Barback - Support bar operations'),
  ('kitchen', 'Kitchen - Handle food preparation'),
  ('security', 'Security - Handle venue security'),
  ('karaoke_main', 'Karaoke Main - Manage karaoke operations'),
  ('karaoke_staff', 'Karaoke Staff - Support karaoke operations')
ON CONFLICT (name) DO NOTHING;
