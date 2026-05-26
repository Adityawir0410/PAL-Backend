require('dotenv').config();
const bcrypt = require('bcrypt');
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const PASSWORD = 'GatotKota123!';
const SALT_ROUNDS = 10;

function log(msg) { console.log(`  ${msg}`); }
function section(msg) { console.log(`\n📦 ${msg}`); }
function ok(msg) { console.log(`  ✅ ${msg}`); }
function err(msg) { console.log(`  ❌ ${msg}`); }

async function clearAll() {
  section('Clearing existing data...');

  // forum_tags has composite PK (no id column) — delete with a different filter
  await supabase.from('forum_tags').delete().not('forum_id', 'is', null);

  // All other tables in dependency order (dependents first)
  const tables = [
    'point_transactions', 'notifications', 'bookmarks',
    'forum_history', 'forum_media', 'comments', 'forums',
    'employee_verification_codes', 'point_rules',
    'users', 'tags', 'levels', 'roles'
  ];
  for (const table of tables) {
    const { error } = await supabase.from(table).delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) log(`warn clearing ${table}: ${error.message}`);
  }

  // Delete all Supabase Auth users
  const { data: authList } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (authList?.users?.length > 0) {
    for (const authUser of authList.users) {
      await supabase.auth.admin.deleteUser(authUser.id);
    }
    log(`Cleared ${authList.users.length} auth users`);
  }

  ok('Cleared all tables');
}

async function seedRoles() {
  section('Seeding roles...');
  const { data, error } = await supabase.from('roles').insert([
    { name: 'user',     description: 'Pengguna umum yang dapat membuat laporan dan berinteraksi di forum' },
    { name: 'karyawan', description: 'Pegawai yang bertanggung jawab menangani laporan di wilayah tertentu' },
    { name: 'admin',    description: 'Administrator sistem dengan akses penuh ke seluruh fitur' },
  ]).select();
  if (error) { err(`Roles: ${error.message}`); throw error; }
  ok(`Inserted ${data.length} roles`);
  return Object.fromEntries(data.map(r => [r.name, r.id]));
}

async function seedLevels() {
  section('Seeding levels...');
  const { data, error } = await supabase.from('levels').insert([
    { name: 'Level Gundala',   points: 0,    description: 'Level awal untuk pengguna baru. Mulai perjalananmu sebagai pelapor infrastruktur!' },
    { name: 'Level GatotKaca', points: 100,  description: 'Kamu sudah aktif berkontribusi! Terus semangat melaporkan masalah di sekitarmu.' },
    { name: 'Level SriAsih',   points: 250,  description: 'Kontribusimu sangat berarti bagi masyarakat. Kamu adalah pahlawan infrastruktur!' },
    { name: 'Level Godam',     points: 500,  description: 'Luar biasa! Kamu telah menjadi warga teladan yang peduli dengan lingkungan sekitar.' },
    { name: 'Level Aquanus',   points: 1000, description: 'Level tertinggi! Kamu adalah legenda pelapor infrastruktur yang paling berdedikasi.' },
  ]).select();
  if (error) { err(`Levels: ${error.message}`); throw error; }
  ok(`Inserted ${data.length} levels`);
  return Object.fromEntries(data.map(l => [l.name, l.id]));
}

async function seedUsers(roleIds, levelIds) {
  section('Seeding users...');
  const hash = await bcrypt.hash(PASSWORD, SALT_ROUNDS);

  const usersData = [
    {
      email: 'admin@gatotkota.com',
      username: 'admin_gatotkota',
      password: hash,
      full_name: 'Administrator GatotKota',
      phone: '081234567890',
      role_id: roleIds['admin'],
      level_id: levelIds['Level Gundala'],
      current_points: 0,
    },
    {
      email: 'karyawan.jatim@gatotkota.com',
      username: 'petugas_jatim',
      password: hash,
      full_name: 'Baskoro Wibowo',
      phone: '082345678901',
      role_id: roleIds['karyawan'],
      level_id: levelIds['Level Gundala'],
      current_points: 0,
      assigned_province: 'Jawa Timur',
      assigned_city: 'Surabaya',
    },
    {
      email: 'karyawan.jabar@gatotkota.com',
      username: 'petugas_jabar',
      password: hash,
      full_name: 'Dian Permata',
      phone: '083456789012',
      role_id: roleIds['karyawan'],
      level_id: levelIds['Level Gundala'],
      current_points: 0,
      assigned_province: 'Jawa Barat',
      assigned_city: 'Bandung',
    },
    {
      email: 'budi.santoso@gmail.com',
      username: 'budi_santoso',
      password: hash,
      full_name: 'Budi Santoso',
      phone: '084567890123',
      role_id: roleIds['user'],
      level_id: levelIds['Level GatotKaca'],
      current_points: 150,
    },
    {
      email: 'siti.rahayu@gmail.com',
      username: 'siti_rahayu',
      password: hash,
      full_name: 'Siti Rahayu',
      phone: '085678901234',
      role_id: roleIds['user'],
      level_id: levelIds['Level Gundala'],
      current_points: 60,
    },
    {
      email: 'ahmad.fauzi@gmail.com',
      username: 'ahmad_fauzi',
      password: hash,
      full_name: 'Ahmad Fauzi',
      phone: '086789012345',
      role_id: roleIds['user'],
      level_id: levelIds['Level SriAsih'],
      current_points: 320,
    },
    {
      email: 'dewi.lestari@gmail.com',
      username: 'dewi_lestari',
      password: hash,
      full_name: 'Dewi Lestari',
      phone: '087890123456',
      role_id: roleIds['user'],
      level_id: levelIds['Level Gundala'],
      current_points: 0,
    },
    {
      email: 'rizky.pratama@gmail.com',
      username: 'rizky_pratama',
      password: hash,
      full_name: 'Rizky Pratama',
      phone: '088901234567',
      role_id: roleIds['user'],
      level_id: levelIds['Level Godam'],
      current_points: 580,
    },
  ];

  const insertedUsers = [];
  for (const userData of usersData) {
    // 1. Create in Supabase Auth first
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: PASSWORD,
      email_confirm: true,
    });
    if (authError) { err(`Auth ${userData.email}: ${authError.message}`); throw authError; }

    // 2. Insert into public.users using the auth user's UUID
    const { data: dbUser, error: dbError } = await supabase
      .from('users')
      .insert({ ...userData, id: authData.user.id })
      .select()
      .single();
    if (dbError) { err(`DB ${userData.email}: ${dbError.message}`); throw dbError; }

    insertedUsers.push(dbUser);
    log(`Created: ${userData.email}`);
  }

  ok(`Inserted ${insertedUsers.length} users`);
  return Object.fromEntries(insertedUsers.map(u => [u.username, u.id]));
}

async function seedTags() {
  section('Seeding tags...');
  const { data, error } = await supabase.from('tags').insert([
    { name: 'Jalan Rusak',          slug: 'jalan-rusak',          description: 'Laporan kerusakan jalan, lubang, atau aspal yang mengelupas',   usage_count: 24 },
    { name: 'Banjir',               slug: 'banjir',               description: 'Laporan genangan air atau banjir yang mengganggu aktivitas',     usage_count: 18 },
    { name: 'Sampah',               slug: 'sampah',               description: 'Laporan tumpukan sampah atau TPS liar yang tidak dikelola',       usage_count: 15 },
    { name: 'Lampu Jalan',          slug: 'lampu-jalan',          description: 'Laporan lampu jalan mati atau penerangan yang tidak memadai',     usage_count: 12 },
    { name: 'Air Bersih',           slug: 'air-bersih',           description: 'Laporan masalah distribusi atau kualitas air bersih',             usage_count: 9  },
    { name: 'Fasilitas Umum',       slug: 'fasilitas-umum',       description: 'Laporan kerusakan fasilitas umum seperti bangku, halte, dll',     usage_count: 11 },
    { name: 'Trotoar Rusak',        slug: 'trotoar-rusak',        description: 'Laporan kerusakan trotoar atau jalur pejalan kaki',               usage_count: 8  },
    { name: 'Drainase',             slug: 'drainase',             description: 'Laporan saluran drainase tersumbat atau rusak',                   usage_count: 14 },
    { name: 'Jembatan',             slug: 'jembatan',             description: 'Laporan kerusakan atau bahaya pada jembatan',                     usage_count: 5  },
    { name: 'Taman Kota',           slug: 'taman-kota',           description: 'Laporan kerusakan atau ketidakbersihan taman kota',               usage_count: 7  },
    { name: 'Pohon Tumbang',        slug: 'pohon-tumbang',        description: 'Laporan pohon tumbang yang membahayakan atau mengganggu lalu lintas', usage_count: 6 },
    { name: 'Fasilitas Kesehatan',  slug: 'fasilitas-kesehatan',  description: 'Laporan masalah pada fasilitas kesehatan publik',                 usage_count: 4  },
  ]).select();
  if (error) { err(`Tags: ${error.message}`); throw error; }
  ok(`Inserted ${data.length} tags`);
  return Object.fromEntries(data.map(t => [t.slug, t.id]));
}

async function seedPointRules(adminId) {
  section('Seeding point rules...');
  const { data, error } = await supabase.from('point_rules').insert([
    { event_type: 'post_created',    event_condition: null,       points: 10, description: 'Poin diberikan setiap membuat laporan infrastruktur baru',            is_active: true, created_by: adminId },
    { event_type: 'comment_created', event_condition: null,       points: 5,  description: 'Poin diberikan setiap memberikan komentar pada laporan',              is_active: true, created_by: adminId },
    { event_type: 'post_upvoted',    event_condition: null,       points: 3,  description: 'Poin diberikan ketika laporan kamu mendapat upvote dari pengguna lain', is_active: true, created_by: adminId },
    { event_type: 'report_resolved', event_condition: 'resolved', points: 50, description: 'Bonus poin ketika laporan yang kamu buat berhasil diselesaikan petugas', is_active: true, created_by: adminId },
    { event_type: 'first_report',    event_condition: 'first',    points: 20, description: 'Bonus poin untuk laporan pertama yang dibuat pengguna baru',           is_active: true, created_by: adminId },
    { event_type: 'daily_login',     event_condition: null,       points: 2,  description: 'Poin harian untuk pengguna yang aktif login setiap hari',              is_active: false, created_by: adminId },
  ]).select();
  if (error) { err(`Point rules: ${error.message}`); throw error; }
  ok(`Inserted ${data.length} point rules`);
}

async function seedEmployeeCodes(adminId) {
  section('Seeding employee verification codes...');
  const future = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await supabase.from('employee_verification_codes').insert([
    { code: 'EMP2026JATIM001', province: 'Jawa Timur',   city: 'Surabaya', expires_at: future, expiry_hours: 720, is_used: false, created_by: adminId, max_uses: 5, current_uses: 0, notes: 'Kode untuk petugas wilayah Surabaya dan sekitarnya' },
    { code: 'EMP2026JABAR001', province: 'Jawa Barat',   city: 'Bandung',  expires_at: future, expiry_hours: 720, is_used: false, created_by: adminId, max_uses: 5, current_uses: 0, notes: 'Kode untuk petugas wilayah Bandung dan sekitarnya' },
    { code: 'EMP2026JKTPST01', province: 'DKI Jakarta',  city: null,       expires_at: future, expiry_hours: 720, is_used: false, created_by: adminId, max_uses: 10, current_uses: 0, notes: 'Kode umum untuk seluruh petugas wilayah DKI Jakarta' },
  ]).select();
  if (error) { err(`Employee codes: ${error.message}`); throw error; }
  ok(`Inserted ${data.length} employee verification codes`);
}

async function seedForums(userIds) {
  section('Seeding forums...');
  const now = new Date();
  const daysAgo = (d) => new Date(now - d * 86400000).toISOString();

  const forums = [
    {
      user_id: userIds['budi_santoso'],
      title: 'Jalan Berlubang Parah di Jl. Raya Darmo Surabaya',
      description: 'Terdapat lubang besar di tengah jalan Raya Darmo tepatnya di depan taman Bungkul. Lubang berdiameter sekitar 1 meter dengan kedalaman 30cm sangat membahayakan pengendara motor dan mobil, terutama saat malam hari karena tidak ada penerangan memadai di sekitar lubang tersebut.',
      latitude: -7.291386, longitude: 112.734780,
      address: 'Jl. Raya Darmo, Darmo, Wonokromo, Surabaya, Jawa Timur',
      status: 'in_progress', priority: 'high',
      incident_date: daysAgo(5).split('T')[0],
      upvotes: 34, downvotes: 2, views_count: 120,
      created_at: daysAgo(5), updated_at: daysAgo(2), in_progress_at: daysAgo(2),
    },
    {
      user_id: userIds['siti_rahayu'],
      title: 'Lampu Jalan Mati Sepanjang 500 Meter di Jl. Pemuda Semarang',
      description: 'Lampu penerangan jalan di sepanjang Jl. Pemuda dari pertigaan Jl. Pandanaran hingga depan Lawang Sewu sudah padam selama 2 minggu. Kondisi ini sangat berbahaya bagi pejalan kaki dan pengendara, terutama pada malam hari. Sudah ada beberapa kejadian kecelakaan ringan di lokasi ini.',
      latitude: -6.984905, longitude: 110.408619,
      address: 'Jl. Pemuda, Sekayu, Semarang Tengah, Kota Semarang, Jawa Tengah',
      status: 'open', priority: 'high',
      incident_date: daysAgo(14).split('T')[0],
      upvotes: 28, downvotes: 0, views_count: 95,
      created_at: daysAgo(14), updated_at: daysAgo(14),
    },
    {
      user_id: userIds['ahmad_fauzi'],
      title: 'Tumpukan Sampah Liar di Pinggir Kali Ciliwung Jakarta',
      description: 'Ada penumpukan sampah ilegal yang sangat besar di pinggiran Kali Ciliwung, tepatnya di bawah jembatan Jl. Otista. Sampah sudah menumpuk setinggi 2 meter dan menyebabkan bau tidak sedap serta berpotensi menyumbat aliran sungai yang bisa menyebabkan banjir.',
      latitude: -6.218483, longitude: 106.862526,
      address: 'Jl. Otista Raya, Bidara Cina, Jatinegara, Jakarta Timur, DKI Jakarta',
      status: 'open', priority: 'medium',
      incident_date: daysAgo(3).split('T')[0],
      upvotes: 45, downvotes: 1, views_count: 210,
      created_at: daysAgo(3), updated_at: daysAgo(3),
    },
    {
      user_id: userIds['rizky_pratama'],
      title: 'Saluran Drainase Tersumbat Menyebabkan Banjir di Bandung',
      description: 'Saluran drainase di Jl. Pasteur tersumbat oleh sampah dan lumpur sehingga setiap hujan deras terjadi genangan air setinggi 40-60cm yang menggenangi jalan dan halaman rumah warga sekitar. Kondisi ini sudah berlangsung selama 3 bulan dan makin parah.',
      latitude: -6.891638, longitude: 107.606186,
      address: 'Jl. Dr. Djunjunan (Pasteur), Pajajaran, Cicendo, Bandung, Jawa Barat',
      status: 'resolved', priority: 'high',
      incident_date: daysAgo(30).split('T')[0],
      upvotes: 67, downvotes: 0, views_count: 345,
      created_at: daysAgo(30), updated_at: daysAgo(7), resolved_at: daysAgo(7),
    },
    {
      user_id: userIds['budi_santoso'],
      title: 'Trotoar Pecah dan Berbahaya di Jl. Sudirman Jakarta',
      description: 'Trotoar di sepanjang Jl. Jend. Sudirman di depan gedung Bursa Efek Jakarta dalam kondisi sangat rusak. Banyak bagian yang pecah, berlubang dan terangkat sehingga sangat berbahaya bagi pejalan kaki, terutama lansia dan pengguna kursi roda.',
      latitude: -6.224072, longitude: 106.807856,
      address: 'Jl. Jend. Sudirman, Senayan, Kebayoran Baru, Jakarta Selatan, DKI Jakarta',
      status: 'open', priority: 'medium',
      incident_date: daysAgo(7).split('T')[0],
      upvotes: 19, downvotes: 3, views_count: 78,
      created_at: daysAgo(7), updated_at: daysAgo(7),
    },
    {
      user_id: userIds['dewi_lestari'],
      title: 'Air PDAM Keruh dan Berbau di Perumahan Griya Asri Malang',
      description: 'Selama seminggu terakhir air yang mengalir dari pipa PDAM di Perumahan Griya Asri berwarna kecoklatan dan berbau tidak sedap. Warga terpaksa membeli air galon untuk kebutuhan sehari-hari. Sudah dilaporkan ke kantor PDAM tapi belum ada respons.',
      latitude: -7.980958, longitude: 112.626022,
      address: 'Perumahan Griya Asri, Lowokwaru, Kota Malang, Jawa Timur',
      status: 'in_progress', priority: 'high',
      incident_date: daysAgo(8).split('T')[0],
      upvotes: 52, downvotes: 0, views_count: 198,
      created_at: daysAgo(8), updated_at: daysAgo(3), in_progress_at: daysAgo(3),
    },
    {
      user_id: userIds['siti_rahayu'],
      title: 'Pohon Besar Tumbang Menghalangi Jalan di Jl. Cipto Yogyakarta',
      description: 'Sebuah pohon besar tumbang akibat angin kencang semalam menghalangi setengah badan jalan di Jl. Cipto Mangunkusumo. Saat ini lalu lintas terganggu dan hanya bisa melewati satu jalur. Diperlukan penanganan segera sebelum terjadi kecelakaan.',
      latitude: -7.797068, longitude: 110.366869,
      address: 'Jl. Dr. Cipto Mangunkusumo, Cokrodiningratan, Jetis, Kota Yogyakarta',
      status: 'resolved', priority: 'high',
      incident_date: daysAgo(1).split('T')[0],
      upvotes: 23, downvotes: 0, views_count: 156,
      created_at: daysAgo(1), updated_at: daysAgo(0), resolved_at: daysAgo(0),
    },
    {
      user_id: userIds['ahmad_fauzi'],
      title: 'Taman Kota Monas Banyak Fasilitas yang Rusak',
      description: 'Beberapa fasilitas di area sekitar Monas dalam kondisi rusak parah: bangku taman patah, lampu taman mati, area bermain anak-anak tidak terawat dengan perosotan yang berkarat dan berbahaya. Mengingat Monas adalah ikon Jakarta, kondisi ini sangat disayangkan.',
      latitude: -6.175392, longitude: 106.827153,
      address: 'Monumen Nasional, Gambir, Jakarta Pusat, DKI Jakarta',
      status: 'open', priority: 'low',
      incident_date: daysAgo(20).split('T')[0],
      upvotes: 38, downvotes: 5, views_count: 267,
      created_at: daysAgo(20), updated_at: daysAgo(20),
    },
    {
      user_id: userIds['rizky_pratama'],
      title: 'Jembatan Kayu Lapuk di Desa Wonorejo Pasuruan',
      description: 'Jembatan kayu yang menghubungkan dua dusun di Desa Wonorejo kondisinya sudah sangat lapuk dan berbahaya. Beberapa papan sudah berlubang dan ada yang patah. Jembatan ini dilintasi warga setiap hari untuk akses ke ladang dan sekolah. Sangat mendesak untuk diperbaiki.',
      latitude: -7.628444, longitude: 112.906200,
      address: 'Desa Wonorejo, Wonorejo, Pasuruan, Jawa Timur',
      status: 'open', priority: 'high',
      incident_date: daysAgo(12).split('T')[0],
      upvotes: 71, downvotes: 1, views_count: 412,
      created_at: daysAgo(12), updated_at: daysAgo(12),
    },
    {
      user_id: userIds['budi_santoso'],
      title: 'Fasilitas Halte Bus Rusak di Terminal Purabaya Surabaya',
      description: 'Atap halte bus di Terminal Purabaya jebol akibat hujan deras minggu lalu. Penumpang yang menunggu bus terpaksa kehujanan. Selain itu, beberapa kursi tunggu juga sudah rusak dan tidak layak digunakan. Perlu perbaikan segera mengingat terminal ini adalah yang tersibuk di Surabaya.',
      latitude: -7.351444, longitude: 112.721584,
      address: 'Terminal Purabaya, Bungurasih, Waru, Sidoarjo, Jawa Timur',
      status: 'closed', priority: 'medium',
      incident_date: daysAgo(45).split('T')[0],
      upvotes: 15, downvotes: 2, views_count: 89,
      created_at: daysAgo(45), updated_at: daysAgo(10), closed_at: daysAgo(10),
    },
  ];

  const { data, error } = await supabase.from('forums').insert(forums).select();
  if (error) { err(`Forums: ${error.message}`); throw error; }
  ok(`Inserted ${data.length} forums`);
  return data;
}

async function seedForumTags(forums, tagIds) {
  section('Seeding forum tags...');
  const mapping = [
    [0, ['jalan-rusak', 'fasilitas-umum']],
    [1, ['lampu-jalan']],
    [2, ['sampah', 'banjir', 'drainase']],
    [3, ['banjir', 'drainase']],
    [4, ['trotoar-rusak', 'fasilitas-umum']],
    [5, ['air-bersih']],
    [6, ['pohon-tumbang']],
    [7, ['taman-kota', 'fasilitas-umum', 'lampu-jalan']],
    [8, ['jembatan']],
    [9, ['fasilitas-umum']],
  ];

  const rows = [];
  for (const [fi, slugs] of mapping) {
    for (const slug of slugs) {
      if (tagIds[slug]) rows.push({ forum_id: forums[fi].id, tag_id: tagIds[slug] });
    }
  }

  const { error } = await supabase.from('forum_tags').insert(rows);
  if (error) { err(`Forum tags: ${error.message}`); throw error; }
  ok(`Inserted ${rows.length} forum-tag relations`);
}

async function seedComments(forums, userIds) {
  section('Seeding comments...');
  const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

  const comments = [
    // Forum 0 - Jalan berlubang Surabaya
    { forum_id: forums[0].id, user_id: userIds['siti_rahayu'],   content: 'Saya juga merasakan ini setiap hari karena lewat sini untuk ke kantor. Sudah sangat parah dan perlu segera ditangani!', created_at: daysAgo(4) },
    { forum_id: forums[0].id, user_id: userIds['ahmad_fauzi'],   content: 'Ban motor saya sempat kempis gara-gara lubang ini. Semoga bisa cepat ditangani ya pak petugas.', created_at: daysAgo(4) },
    { forum_id: forums[0].id, user_id: userIds['rizky_pratama'], content: 'Saya sudah foto dan laporkan ke dinas PU juga, tapi belum ada respons. Semoga laporan di sini lebih diperhatikan.', created_at: daysAgo(3) },

    // Forum 1 - Lampu jalan Semarang
    { forum_id: forums[1].id, user_id: userIds['budi_santoso'],  content: 'Kemarin teman saya hampir celaka di sini karena tidak terlihat ada pengendara lain dari arah berlawanan.', created_at: daysAgo(13) },
    { forum_id: forums[1].id, user_id: userIds['dewi_lestari'],  content: 'Setuju, kondisinya sangat gelap dan berbahaya. Mohon segera diperbaiki dinas terkait.', created_at: daysAgo(12) },

    // Forum 2 - Sampah Jakarta
    { forum_id: forums[2].id, user_id: userIds['budi_santoso'],  content: 'Ini sudah berlangsung lama sekali! Warga sudah berkali-kali komplain tapi tidak ada tindakan dari kelurahan.', created_at: daysAgo(2) },
    { forum_id: forums[2].id, user_id: userIds['rizky_pratama'], content: 'Selain bau, ini juga jadi sarang nyamuk dan bisa menyebabkan DBD. Perlu penanganan darurat!', created_at: daysAgo(2) },
    { forum_id: forums[2].id, user_id: userIds['siti_rahayu'],   content: 'Saya sudah video kondisinya dan akan upload ke medsos juga supaya lebih viral dan cepat ditangani.', created_at: daysAgo(1) },

    // Forum 3 - Drainase Bandung (resolved)
    { forum_id: forums[3].id, user_id: userIds['dewi_lestari'],  content: 'Alhamdulillah sudah selesai diperbaiki! Terima kasih kepada petugas yang sudah cepat merespons laporan ini.', created_at: daysAgo(6) },
    { forum_id: forums[3].id, user_id: userIds['budi_santoso'],  content: 'Senang dengarnya! Ini bukti bahwa aplikasi ini bermanfaat. Mari terus aktif melaporkan masalah di lingkungan kita.', created_at: daysAgo(6) },

    // Forum 5 - Air PDAM Malang
    { forum_id: forums[5].id, user_id: userIds['ahmad_fauzi'],   content: 'Masalah yang sama juga terjadi di blok sebelah. Sudah menyebar ke beberapa RT.', created_at: daysAgo(7) },
    { forum_id: forums[5].id, user_id: userIds['rizky_pratama'], content: 'Coba juga laporkan ke Ombudsman kalau PDAM tidak merespons dalam 3 hari kerja.', created_at: daysAgo(5) },

    // Forum 8 - Jembatan Pasuruan
    { forum_id: forums[8].id, user_id: userIds['siti_rahayu'],   content: 'Kasihan warga yang harus lewat sini setiap hari. Apalagi anak-anak sekolah yang bawa tas berat.', created_at: daysAgo(11) },
    { forum_id: forums[8].id, user_id: userIds['dewi_lestari'],  content: 'Sementara sambil nunggu perbaikan, mungkin bisa dipasang tali pengaman dulu atau rambu peringatan.', created_at: daysAgo(10) },
    { forum_id: forums[8].id, user_id: userIds['ahmad_fauzi'],   content: 'Saya sudah share ke grup RT dan akan coba koordinasi dengan pak RT untuk ajukan langsung ke desa.', created_at: daysAgo(9) },
  ];

  const { data, error } = await supabase.from('comments').insert(comments).select();
  if (error) { err(`Comments: ${error.message}`); throw error; }
  ok(`Inserted ${data.length} comments`);
  return data;
}

async function seedBookmarks(forums, userIds) {
  section('Seeding bookmarks...');
  const rows = [
    { user_id: userIds['budi_santoso'],  forum_id: forums[2].id },
    { user_id: userIds['budi_santoso'],  forum_id: forums[8].id },
    { user_id: userIds['siti_rahayu'],   forum_id: forums[0].id },
    { user_id: userIds['siti_rahayu'],   forum_id: forums[3].id },
    { user_id: userIds['ahmad_fauzi'],   forum_id: forums[5].id },
    { user_id: userIds['rizky_pratama'], forum_id: forums[1].id },
    { user_id: userIds['dewi_lestari'],  forum_id: forums[8].id },
  ];

  const { error } = await supabase.from('bookmarks').insert(rows);
  if (error) { err(`Bookmarks: ${error.message}`); throw error; }
  ok(`Inserted ${rows.length} bookmarks`);
}

async function seedNotifications(forums, userIds) {
  section('Seeding notifications...');
  const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

  const notifs = [
    {
      user_id: userIds['budi_santoso'], forum_id: forums[0].id,
      title: 'Sistem GatotKota', message: 'Laporan Anda sedang dalam proses penanganan oleh petugas.',
      type: 'status_change', is_read: true, read_at: daysAgo(1), created_at: daysAgo(2),
    },
    {
      user_id: userIds['rizky_pratama'], forum_id: forums[3].id,
      title: 'Sistem GatotKota', message: 'Laporan Anda telah berhasil diselesaikan oleh petugas.',
      type: 'status_change', is_read: true, read_at: daysAgo(6), created_at: daysAgo(7),
    },
    {
      user_id: userIds['budi_santoso'], forum_id: forums[0].id,
      title: '@siti_rahayu', message: 'siti_rahayu mengomentari postingan Anda: "Saya juga merasakan ini setiap hari..."',
      type: 'forum_comment', is_read: false, created_at: daysAgo(4),
    },
    {
      user_id: userIds['budi_santoso'], forum_id: forums[0].id,
      title: '@ahmad_fauzi', message: 'ahmad_fauzi mengomentari postingan Anda: "Ban motor saya sempat kempis..."',
      type: 'forum_comment', is_read: false, created_at: daysAgo(4),
    },
    {
      user_id: userIds['siti_rahayu'], forum_id: forums[1].id,
      title: '@budi_santoso', message: 'budi_santoso mengomentari postingan Anda: "Kemarin teman saya hampir celaka..."',
      type: 'forum_comment', is_read: true, read_at: daysAgo(12), created_at: daysAgo(13),
    },
    {
      user_id: userIds['rizky_pratama'], forum_id: forums[3].id,
      title: '🎉 Level Up!', message: 'Selamat! Anda telah naik ke level "Level Godam" dengan 500 poin!',
      type: 'level_up', is_read: false, created_at: daysAgo(5),
    },
    {
      user_id: userIds['ahmad_fauzi'], forum_id: null,
      title: 'Sistem GatotKota', message: 'Selamat datang di GatotKota! Mulai berkontribusi dengan melaporkan masalah infrastruktur di sekitar Anda.',
      type: 'system', is_read: true, read_at: daysAgo(30), created_at: daysAgo(31),
    },
    {
      user_id: userIds['dewi_lestari'], forum_id: forums[5].id,
      title: 'Sistem GatotKota', message: 'Laporan Anda sedang dalam proses penanganan oleh petugas.',
      type: 'status_change', is_read: false, created_at: daysAgo(3),
    },
  ];

  const { error } = await supabase.from('notifications').insert(notifs);
  if (error) { err(`Notifications: ${error.message}`); throw error; }
  ok(`Inserted ${notifs.length} notifications`);
}

async function seedPointTransactions(forums, userIds, adminId) {
  section('Seeding point transactions...');
  const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

  const tx = [
    { user_id: userIds['budi_santoso'],  points: 20, event_type: 'first_report',    related_forum_id: forums[0].id, description: 'Bonus poin laporan pertama',               created_at: daysAgo(45) },
    { user_id: userIds['budi_santoso'],  points: 10, event_type: 'post_created',     related_forum_id: forums[0].id, description: 'Membuat laporan baru',                    created_at: daysAgo(45) },
    { user_id: userIds['budi_santoso'],  points: 10, event_type: 'post_created',     related_forum_id: forums[4].id, description: 'Membuat laporan baru',                    created_at: daysAgo(7) },
    { user_id: userIds['budi_santoso'],  points: 10, event_type: 'post_created',     related_forum_id: forums[9].id, description: 'Membuat laporan baru',                    created_at: daysAgo(45) },
    { user_id: userIds['budi_santoso'],  points: 5,  event_type: 'comment_created',  related_forum_id: forums[2].id, description: 'Memberikan komentar',                     created_at: daysAgo(2) },
    { user_id: userIds['budi_santoso'],  points: 5,  event_type: 'comment_created',  related_forum_id: forums[3].id, description: 'Memberikan komentar',                     created_at: daysAgo(6) },

    { user_id: userIds['siti_rahayu'],   points: 20, event_type: 'first_report',     related_forum_id: forums[1].id, description: 'Bonus poin laporan pertama',               created_at: daysAgo(14) },
    { user_id: userIds['siti_rahayu'],   points: 10, event_type: 'post_created',     related_forum_id: forums[1].id, description: 'Membuat laporan baru',                    created_at: daysAgo(14) },
    { user_id: userIds['siti_rahayu'],   points: 5,  event_type: 'comment_created',  related_forum_id: forums[0].id, description: 'Memberikan komentar',                     created_at: daysAgo(4) },
    { user_id: userIds['siti_rahayu'],   points: 5,  event_type: 'comment_created',  related_forum_id: forums[5].id, description: 'Memberikan komentar',                     created_at: daysAgo(7) },

    { user_id: userIds['ahmad_fauzi'],   points: 20, event_type: 'first_report',     related_forum_id: forums[2].id, description: 'Bonus poin laporan pertama',               created_at: daysAgo(3) },
    { user_id: userIds['ahmad_fauzi'],   points: 10, event_type: 'post_created',     related_forum_id: forums[2].id, description: 'Membuat laporan baru',                    created_at: daysAgo(3) },
    { user_id: userIds['ahmad_fauzi'],   points: 10, event_type: 'post_created',     related_forum_id: forums[7].id, description: 'Membuat laporan baru',                    created_at: daysAgo(20) },
    { user_id: userIds['ahmad_fauzi'],   points: 50, event_type: 'report_resolved',  related_forum_id: forums[3].id, description: 'Laporan berhasil diselesaikan',            created_at: daysAgo(7) },

    { user_id: userIds['rizky_pratama'], points: 20, event_type: 'first_report',     related_forum_id: forums[3].id, description: 'Bonus poin laporan pertama',               created_at: daysAgo(30) },
    { user_id: userIds['rizky_pratama'], points: 10, event_type: 'post_created',     related_forum_id: forums[3].id, description: 'Membuat laporan baru',                    created_at: daysAgo(30) },
    { user_id: userIds['rizky_pratama'], points: 10, event_type: 'post_created',     related_forum_id: forums[8].id, description: 'Membuat laporan baru',                    created_at: daysAgo(12) },
    { user_id: userIds['rizky_pratama'], points: 50, event_type: 'report_resolved',  related_forum_id: forums[3].id, description: 'Laporan berhasil diselesaikan',            created_at: daysAgo(7) },
    { user_id: userIds['rizky_pratama'], points: 5,  event_type: 'comment_created',  related_forum_id: forums[0].id, description: 'Memberikan komentar',                     created_at: daysAgo(3) },
    { user_id: userIds['rizky_pratama'], points: 5,  event_type: 'comment_created',  related_forum_id: forums[5].id, description: 'Memberikan komentar',                     created_at: daysAgo(5) },

    { user_id: userIds['dewi_lestari'],  points: 10, event_type: 'post_created',     related_forum_id: forums[5].id, description: 'Membuat laporan baru',                    created_at: daysAgo(8) },
  ];

  const { error } = await supabase.from('point_transactions').insert(tx);
  if (error) { err(`Point transactions: ${error.message}`); throw error; }
  ok(`Inserted ${tx.length} point transactions`);
}

async function main() {
  console.log('====================================');
  console.log('   GatotKota Database Seeder');
  console.log('====================================');
  console.log(`\n🔑 Default password semua akun: "${PASSWORD}"`);

  try {
    await clearAll();

    const roleIds  = await seedRoles();
    const levelIds = await seedLevels();
    const userIds  = await seedUsers(roleIds, levelIds);
    const tagIds   = await seedTags();

    await seedPointRules(userIds['admin_gatotkota']);
    await seedEmployeeCodes(userIds['admin_gatotkota']);

    const forums = await seedForums(userIds);
    await seedForumTags(forums, tagIds);
    await seedComments(forums, userIds);
    await seedBookmarks(forums, userIds);
    await seedNotifications(forums, userIds);
    await seedPointTransactions(forums, userIds, userIds['admin_gatotkota']);

    console.log('\n====================================');
    console.log('✅ Seeding selesai!\n');
    console.log('📋 Akun yang tersedia:');
    console.log('   👑 Admin  : admin@gatotkota.com');
    console.log('   👷 Karyawan: karyawan.jatim@gatotkota.com (Jawa Timur)');
    console.log('   👷 Karyawan: karyawan.jabar@gatotkota.com (Jawa Barat)');
    console.log('   👤 User   : budi.santoso@gmail.com');
    console.log('   👤 User   : siti.rahayu@gmail.com');
    console.log('   👤 User   : ahmad.fauzi@gmail.com');
    console.log('   👤 User   : dewi.lestari@gmail.com');
    console.log('   👤 User   : rizky.pratama@gmail.com');
    console.log(`\n   🔑 Password semua akun: ${PASSWORD}`);
    console.log('\n🎟️  Kode Verifikasi Karyawan:');
    console.log('   EMP2026JATIM001 → Jawa Timur');
    console.log('   EMP2026JABAR001 → Jawa Barat');
    console.log('   EMP2026JKTPST01 → DKI Jakarta');
    console.log('====================================\n');

  } catch (e) {
    console.error('\n❌ Seeding gagal:', e.message);
    process.exit(1);
  }
}

main();
