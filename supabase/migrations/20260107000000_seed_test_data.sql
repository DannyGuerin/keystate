
DO $$
DECLARE
  v_campaign_id UUID;
BEGIN
  -- Insert Campaign
  INSERT INTO public.campaigns (company_name, unique_code, status, contact_person)
  VALUES ('Test Estate Agents', 'TEST', 'active', 'Danny Guerin')
  ON CONFLICT (unique_code) DO UPDATE SET status = 'active'
  RETURNING id INTO v_campaign_id;

  -- Insert Variant if not exists
  IF NOT EXISTS (SELECT 1 FROM public.keyring_variants WHERE campaign_id = v_campaign_id) THEN
    INSERT INTO public.keyring_variants (campaign_id, type, color, is_available, sort_order, image_url)
    VALUES (v_campaign_id, 'Metal', 'Silver', true, 1, 'https://placehold.co/400x400/silver/white?text=Keyring');

    INSERT INTO public.keyring_variants (campaign_id, type, color, is_available, sort_order, image_url)
    VALUES (v_campaign_id, 'Leather', 'Black', true, 2, 'https://placehold.co/400x400/black/white?text=Keyring');
  END IF;
END $$;
